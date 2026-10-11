import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Unit } from '../../common/entities/unit.entity';
import { UnitImage } from '../../common/entities/unit-image.entity';
import { Amenity } from '../../common/entities/amenity.entity';
import { Image } from '../../common/entities/image.entity';
import { AmenityService } from '../amenity/amenity.service';
import { ProjectService } from '../project/project.service';
import { CreateUnitInput } from './dto/create-unit.input';
import { UpdateUnitInput } from './dto/update-unit.input';
import { UnitFilterInput } from './dto/unit-filter.input';
import {
  UnitSortInput,
  UnitSortField,
  SortDirection,
} from './dto/unit-sort.input';
import { compileUnitFilter } from '../search/unit-filter';
import {
  RankedUnit,
  SIMILAR_CANDIDATES,
  rankSimilarUnits,
  similarityTiers,
} from './similar-units';
import { SearchService } from '../search/search.service';
import { UnitSyncQueue } from '../sync/unit-sync.queue';
import {
  EMBEDDING_MODELS,
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../embedding/embedding.provider';

export interface FeedCandidate {
  id: string;
  similarity: number | null;
  /** Saves and views across all buyers. */
  popularity: number;
}

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitImage)
    private unitImageRepository: Repository<UnitImage>,
    private projectService: ProjectService,
    private amenityService: AmenityService,
    private dataSource: DataSource,
    private unitSyncQueue: UnitSyncQueue,
    @Inject(EMBEDDING_PROVIDER) private embeddings: EmbeddingProvider,
    private searchService: SearchService
  ) {}

  async findAllWithCount(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<[Unit[], number, any?]> {
    const { text, filter: parsed } =
      await this.searchService.understand(filter);
    const { where, params } = compileUnitFilter({
      ...parsed,
      searchTerm: text,
    }).sql;
    const sortColumns: Record<string, keyof Unit> = {
      [UnitSortField.NAME]: 'name',
      [UnitSortField.PRICE]: 'price',
      [UnitSortField.CREATED_AT]: 'createdAt',
    };
    const sortColumn = sortColumns[sort?.field] ?? 'createdAt';
    const direction =
      sort?.direction ??
      (sortColumn === 'createdAt' ? SortDirection.DESC : SortDirection.ASC);

    const [units, count] = await this.unitRepository
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.project', 'project')
      .leftJoinAndSelect('project.developer', 'developer')
      .leftJoinAndSelect('unit.amenities', 'amenities')
      .where(where, params)
      .orderBy(`unit.${sortColumn}`, direction)
      .addOrderBy('unit.id')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    const imagesByUnit = await this.getImagesForUnits(units.map((u) => u.id));
    for (const unit of units) {
      unit.images = imagesByUnit.get(unit.id) ?? [];
    }

    return [units, count];
  }

  async findOne(id: string): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { id },
      relations: ['project', 'project.developer', 'amenities', 'images'],
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Load images with ordering
    unit.images = await this.getUnitImages(id);

    return unit;
  }

  async findSimilarUnits(unitId: string, limit = 4): Promise<RankedUnit[]> {
    const seed = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['project'],
    });
    if (!seed) throw new NotFoundException(`Unit with ID ${unitId} not found`);

    let rows: { id: string; similarity: number | null }[] = [];
    for (const tier of similarityTiers(seed)) {
      rows = await this.similarCandidates(seed, tier);
      if (rows.length >= limit) break;
    }
    if (rows.length === 0) return [];

    const units = await this.findManyByIds(rows.map((r) => r.id));
    const byId = new Map(units.map((u) => [u.id, u]));
    const candidates = rows
      .filter((r) => byId.has(r.id))
      .map((r) => ({ unit: byId.get(r.id), similarity: r.similarity }));

    return rankSimilarUnits(seed, candidates, limit, this.vectorFloor);
  }

  /** Units with their project, amenities and images, in the order of `ids`. */
  async findManyByIds(ids: string[]): Promise<Unit[]> {
    if (ids.length === 0) return [];

    const units = await this.unitRepository.find({
      where: { id: In(ids) },
      relations: ['project', 'project.developer', 'amenities'],
    });
    const imagesByUnit = await this.getImagesForUnits(ids);
    const byId = new Map(units.map((u) => [u.id, u]));
    const detailedUnits = ids
      .map((id) => byId.get(id))
      .filter((u): u is Unit => !!u);
    for (const unit of detailedUnits) {
      unit.images = imagesByUnit.get(unit.id) ?? [];
    }

    return detailedUnits;
  }

  /**
   * Feed candidates in the filtered pool: closest to the taste vector first
   * (exact, like similarCandidates), then most saved and viewed, then newest.
   */
  async feedCandidates(
    filter: UnitFilterInput,
    taste: number[] | null,
    limit: number,
    {
      createdAfter,
      excludeIds = [],
    }: { createdAfter?: Date; excludeIds?: string[] } = {}
  ): Promise<FeedCandidate[]> {
    const { where, params } = compileUnitFilter(filter).sql;
    const qb = this.unitRepository
      .createQueryBuilder('unit')
      .innerJoin('unit.project', 'project')
      .select('unit.id', 'id')
      .addSelect(
        `(SELECT COUNT(*) FROM buyer_events be
          WHERE be.unit_id = unit.id AND be.type <> 'skip')`,
        'popularity'
      )
      .where(where, params);
    if (taste) {
      qb.leftJoin(
        'unit_embeddings',
        'e',
        'e.unit_id = unit.id AND e.model = :model',
        { model: this.embeddings.model }
      )
        .addSelect('1 - (e.embedding <=> CAST(:taste AS vector))', 'similarity')
        .setParameter('taste', `[${taste.join(',')}]`)
        .orderBy('similarity', 'DESC', 'NULLS LAST');
    } else {
      qb.addSelect('NULL', 'similarity');
    }
    if (createdAfter) {
      qb.andWhere('unit.createdAt > :createdAfter', { createdAfter });
    }
    if (excludeIds.length) {
      qb.andWhere('unit.id NOT IN (:...excludeIds)', { excludeIds });
    }
    const rows = await qb
      .addOrderBy('popularity', 'DESC')
      .addOrderBy('unit.createdAt', 'DESC')
      .limit(limit)
      .getRawMany();
    return rows.map((r) => ({
      id: r.id,
      similarity: r.similarity == null ? null : Number(r.similarity),
      popularity: Number(r.popularity),
    }));
  }

  /** Cosine similarity of each unit's embedding to `vector`; units without one are left out. */
  async similarityTo(
    unitIds: string[],
    vector: number[]
  ): Promise<Map<string, number>> {
    if (unitIds.length === 0) return new Map();
    const rows: { unit_id: string; similarity: string }[] =
      await this.dataSource.query(
        `SELECT unit_id, 1 - (embedding <=> $3::vector) AS similarity
         FROM unit_embeddings WHERE unit_id = ANY($1) AND model = $2`,
        [unitIds, this.embeddings.model, `[${vector.join(',')}]`]
      );
    return new Map(rows.map((r) => [r.unit_id, Number(r.similarity)]));
  }

  /** The cosine similarity a model's unrelated matches sit at. */
  get vectorFloor(): number {
    return 1 - EMBEDDING_MODELS[this.embeddings.model].maxDistance;
  }

  /** Exact nearest neighbours within the filtered pool, not the ANN index: post-filtering an index scan can return too few rows. */
  private async similarCandidates(
    seed: Unit,
    filter: UnitFilterInput
  ): Promise<{ id: string; similarity: number | null }[]> {
    const { where, params } = compileUnitFilter(filter).sql;
    const rows = await this.unitRepository
      .createQueryBuilder('unit')
      .innerJoin('unit.project', 'project')
      .leftJoin(
        'unit_embeddings',
        'e',
        'e.unit_id = unit.id AND e.model = :model'
      )
      .leftJoin(
        'unit_embeddings',
        's',
        's.unit_id = :seedId AND s.model = :model'
      )
      .select('unit.id', 'id')
      .addSelect('1 - (e.embedding <=> s.embedding)', 'similarity')
      .where('unit.id <> :seedId', {
        seedId: seed.id,
        model: this.embeddings.model,
      })
      .andWhere(where, params)
      .orderBy('similarity', 'DESC', 'NULLS LAST')
      .addOrderBy('ABS(unit.price - :seedPrice)', 'ASC')
      .setParameter('seedPrice', Number(seed.price))
      .limit(SIMILAR_CANDIDATES)
      .getRawMany();
    return rows.map((r) => ({
      id: r.id,
      similarity: r.similarity == null ? null : Number(r.similarity),
    }));
  }

  async create(createUnitInput: CreateUnitInput): Promise<Unit> {
    // Get a transaction for consistent DB operations
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Create the unit
      const unit = this.unitRepository.create(createUnitInput);

      // Check if project exists
      const project = await this.projectService.findOne(
        createUnitInput.projectId
      );
      if (!project) {
        throw new NotFoundException(
          `Project with ID ${createUnitInput.projectId} not found`
        );
      }

      // Save the new unit
      const savedUnit = await queryRunner.manager.save(unit);

      // Handle amenities
      if (createUnitInput.amenityIds && createUnitInput.amenityIds.length > 0) {
        // Get amenities
        const amenities = await this.amenityService.findByIds(
          createUnitInput.amenityIds
        );

        // Assign amenities to unit
        savedUnit.amenities = amenities;
        await queryRunner.manager.save(savedUnit);
      }

      // Handle images if provided
      if (createUnitInput.imageIds && createUnitInput.imageIds.length > 0) {
        // Create unit_images junction records with order
        for (let i = 0; i < createUnitInput.imageIds.length; i++) {
          const unitImage = new UnitImage();
          unitImage.unitId = savedUnit.id;
          unitImage.imageId = createUnitInput.imageIds[i];
          unitImage.order = i;
          await queryRunner.manager.save(unitImage);
        }
      }

      await this.unitSyncQueue.enqueue([savedUnit.id], queryRunner.manager);
      await queryRunner.commitTransaction();

      return this.findOne(savedUnit.id);
    } catch (error) {
      // Rollback transaction on error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async update(id: string, updateUnitInput: UpdateUnitInput): Promise<Unit> {
    // Get a transaction for consistent DB operations
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Find the unit
      const unit = await this.unitRepository.findOne({
        where: { id },
        relations: ['amenities'],
      });

      if (!unit) {
        throw new NotFoundException(`Unit with ID ${id} not found`);
      }

      // Update unit properties
      for (const key in updateUnitInput) {
        if (key !== 'id' && key !== 'amenityIds' && key !== 'imageIds') {
          unit[key] = updateUnitInput[key];
        }
      }

      // Handle amenities if provided
      if (updateUnitInput.amenityIds) {
        // Get amenities
        const amenities = await this.amenityService.findByIds(
          updateUnitInput.amenityIds
        );
        unit.amenities = amenities;
      }

      // Handle images if provided
      if (updateUnitInput.imageIds) {
        // First delete existing unit_images records
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(UnitImage)
          .where('unitId = :unitId', { unitId: id })
          .execute();

        // Then create new unit_images junction records with order
        for (let i = 0; i < updateUnitInput.imageIds.length; i++) {
          const unitImage = new UnitImage();
          unitImage.unitId = id;
          unitImage.imageId = updateUnitInput.imageIds[i];
          unitImage.order = i;
          await queryRunner.manager.save(unitImage);
        }
      }

      // Save updates
      await queryRunner.manager.save(unit);
      await this.unitSyncQueue.enqueue([id], queryRunner.manager);
      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (error) {
      // Rollback transaction on error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<Unit> {
    const unit = await this.findOne(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Unit, id);
      await this.unitSyncQueue.enqueue([id], manager);
    });

    return unit;
  }

  async getUnitAmenities(unitId: string): Promise<Amenity[]> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['amenities'],
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }

    return unit.amenities || [];
  }

  async getImagesForUnits(unitIds: string[]): Promise<Map<string, Image[]>> {
    const result = new Map<string, Image[]>();
    if (unitIds.length === 0) return result;

    const unitImages = await this.unitImageRepository.find({
      where: { unitId: In(unitIds) },
      relations: ['image'],
      order: { order: 'ASC' },
    });
    for (const ui of unitImages) {
      const list = result.get(ui.unitId) ?? [];
      list.push(ui.image);
      result.set(ui.unitId, list);
    }
    return result;
  }

  async getUnitImages(unitId: string): Promise<Image[]> {
    const unitImages = await this.unitImageRepository.find({
      where: { unitId },
      relations: ['image'],
      order: { order: 'ASC' },
    });

    if (!unitImages || unitImages.length === 0) {
      return [];
    }

    return unitImages.map((ui) => ui.image);
  }
}
