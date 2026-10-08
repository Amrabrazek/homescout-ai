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
import { UnitSyncQueue } from '../sync/unit-sync.queue';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../embedding/embedding.provider';

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
    @Inject(EMBEDDING_PROVIDER) private embeddings: EmbeddingProvider
  ) {}

  async findAllWithCount(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<[Unit[], number, any?]> {
    const { where, params } = compileUnitFilter(filter).sql;
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

  async findSimilarUnits(unitId: string, limit = 5): Promise<Unit[]> {
    const similarUnits = await this.unitRepository.query(
      `SELECT id FROM match_similar_units($1, $2, 0, $3) ORDER BY similarity DESC`,
      [unitId, this.embeddings.model, limit]
    );

    const ids: string[] = similarUnits.map((row) => row.id);
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
