import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Repository,
  Like,
  ILike,
  MoreThanOrEqual,
  LessThanOrEqual,
  Between,
  Raw,
  In,
} from 'typeorm';
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
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  UnitCreatedEvent,
  UnitUpdatedEvent,
  UnitDeletedEvent,
} from '../../common/events/unit.events';
import { DataSource } from 'typeorm';
import { TypesenseService } from '../../common/typesense/typesense.service';

@Injectable()
export class UnitService {
  private readonly logger = new Logger(UnitService.name);

  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitImage)
    private unitImageRepository: Repository<UnitImage>,
    private projectService: ProjectService,
    private amenityService: AmenityService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
    private typesenseService: TypesenseService
  ) {}

  async findAllWithCount(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<[Unit[], number, any?]> {
    // Use Typesense for search if config flag is enabled
    const useTypesense = this.configService.get<string>('USE_TYPESENSE') === 'true';
    
    if (useTypesense) {
      try {
        // Build search parameters for Typesense
        const searchParams: any = {
          q: filter?.searchTerm || '*',
          query_by: 'name,number,description,projectName,developerName,amenityNames',
          filter_by: '',
          sort_by: '',
          page: offset ? Math.floor(offset / (limit || 20)) + 1 : 1,
          per_page: limit || 20,
          facet_by: 'projectId,rooms,floor,price,floorArea,amenityNames,amenityIds,projectName,developerName',
          num_typos: 1,
          prefix: true,
          cache: true,
          prioritize_exact_match: true,
          prioritize_token_position: true,
          include_fields: '*', // Include all fields to avoid additional DB queries
        };

        // Add filtering (same logic as before)
        const filterConditions = [];

        if (filter?.projectIds && filter.projectIds.length > 0) {
          const projectFilter = filter.projectIds.map(id => `projectId:=${id}`).join(' || ');
          filterConditions.push(`(${projectFilter})`);
        }

        if (filter?.amenityIds && filter.amenityIds.length > 0) {
          // Use the amenityIds directly with Typesense filtering
          const amenityFilter = filter.amenityIds.map(id => `amenityIds:=${id}`).join(' && ');
          filterConditions.push(`(${amenityFilter})`);
        }

        if (filter?.minRooms !== undefined) {
          filterConditions.push(`rooms:>=${filter.minRooms}`);
        }
        if (filter?.maxRooms !== undefined) {
          filterConditions.push(`rooms:<=${filter.maxRooms}`);
        }

        if (filter?.minPrice !== undefined) {
          filterConditions.push(`price:>=${filter.minPrice}`);
        }
        if (filter?.maxPrice !== undefined) {
          filterConditions.push(`price:<=${filter.maxPrice}`);
        }

        if (filter?.minFloorArea !== undefined) {
          filterConditions.push(`floorArea:>=${filter.minFloorArea}`);
        }
        if (filter?.maxFloorArea !== undefined) {
          filterConditions.push(`floorArea:<=${filter.maxFloorArea}`);
        }

        // Combine all filter conditions
        if (filterConditions.length > 0) {
          searchParams.filter_by = filterConditions.join(' && ');
        }

        // Set sort options
        if (sort?.field === UnitSortField.NAME) {
          searchParams.sort_by = `name:${sort.direction === SortDirection.DESC ? 'desc' : 'asc'}`;
        } else if (sort?.field === UnitSortField.PRICE) {
          searchParams.sort_by = `price:${sort.direction === SortDirection.DESC ? 'desc' : 'asc'}`;
        } else if (sort?.field === UnitSortField.CREATED_AT) {
          searchParams.sort_by = `createdAt:${sort.direction === SortDirection.DESC ? 'desc' : 'asc'}`;
        } else {
          // Default order is by createdAt desc
          searchParams.sort_by = 'createdAt:desc';
        }

        this.logger.debug(
          `Typesense search params: ${JSON.stringify(searchParams)}`
        );
        const searchResults =
          await this.typesenseService.searchUnits(searchParams);

        // Total found from Typesense
        const total = searchResults.found;

        // Extract facet counts from the search results
        const facetCounts = searchResults.facet_counts || [];

        // Map Typesense results directly to Unit entities
        if (searchResults.hits && searchResults.hits.length > 0) {
          // Convert Typesense documents directly to Unit entities
          const units = searchResults.hits.map((hit) => {
            const doc = hit.document;
            const unit = new Unit();

            // Map basic properties
            unit.id = doc.id;
            unit.name = doc.name;
            unit.number = doc.number;
            unit.description = doc.description;
            unit.floor = doc.floor;
            unit.rooms = doc.rooms;
            unit.bathrooms = doc.bathrooms;
            unit.floorArea = doc.floorArea;
            unit.price = doc.price;
            unit.createdAt = new Date(doc.createdAt);

            // Map project
            unit.project = {
              id: doc.projectId,
              name: doc.projectName,
              developer: {
                id: '', // Will be populated via GraphQL resolver if needed
                name: doc.developerName,
              },
            } as any;

            // Map amenities
            if (doc.amenityIds && doc.amenityNames) {
              unit.amenities = doc.amenityIds.map((id, index) => ({
                id,
                name: doc.amenityNames[index] || '',
              })) as any[];
            } else {
              unit.amenities = [];
            }

            // Map images
            if (doc.imageUrls) {
              unit.images = doc.imageUrls.map((url, index) => ({
                id: `${unit.id}-image-${index}`,
                url,
                altText: unit.name,
              })) as any[];
            } else {
              unit.images = [];
            }

            return unit;
          });

          return [units, total, facetCounts];
        }

        return [[], total, facetCounts];
      } catch (error) {
        this.logger.error(
          `Typesense search error: ${error.message}`,
          error.stack
        );
        // Fall back to database search on error
      }
    }

    // Database search (fallback)
    const where: any = {};

    if (filter) {
      if (filter.searchTerm) {
        // Search in both name and number fields with OR condition
        where.name = Raw(
          (alias) => `${alias} ILIKE :searchTerm OR number ILIKE :searchTerm`,
          { searchTerm: `%${filter.searchTerm}%` }
        );
      }

      // Handle multiple project IDs or single project ID
      if (filter.projectIds && filter.projectIds.length > 0) {
        where.projectId = In(filter.projectIds);
      }

      // Handle amenity IDs filter
      if (filter.amenityIds && filter.amenityIds.length > 0) {
        where.id = Raw(
          (alias) => {
            return `${alias} IN (
            SELECT unit_id FROM unit_amenities
            WHERE amenity_id IN (:...amenityIds)
            GROUP BY unit_id
            HAVING COUNT(DISTINCT amenity_id) = :amenityCount
          )`;
          },
          {
            amenityIds: filter.amenityIds,
            amenityCount: filter.amenityIds.length, // Require ALL selected amenities
          }
        );
      }

      if (filter.minRooms !== undefined && filter.maxRooms !== undefined) {
        where.rooms = Between(filter.minRooms, filter.maxRooms);
      } else if (filter.minRooms !== undefined) {
        where.rooms = MoreThanOrEqual(filter.minRooms);
      } else if (filter.maxRooms !== undefined) {
        where.rooms = LessThanOrEqual(filter.maxRooms);
      }

      if (filter.minPrice !== undefined && filter.maxPrice !== undefined) {
        where.price = Between(filter.minPrice, filter.maxPrice);
      } else if (filter.minPrice !== undefined) {
        where.price = MoreThanOrEqual(filter.minPrice);
      } else if (filter.maxPrice !== undefined) {
        where.price = LessThanOrEqual(filter.maxPrice);
      }

      if (
        filter.minFloorArea !== undefined &&
        filter.maxFloorArea !== undefined
      ) {
        where.floorArea = Between(filter.minFloorArea, filter.maxFloorArea);
      } else if (filter.minFloorArea !== undefined) {
        where.floorArea = MoreThanOrEqual(filter.minFloorArea);
      } else if (filter.maxFloorArea !== undefined) {
        where.floorArea = LessThanOrEqual(filter.maxFloorArea);
      }
    }

    // Define order based on sort input
    const order: any = {};

    if (sort?.field === UnitSortField.NAME) {
      order.name = sort.direction || SortDirection.ASC;
    } else if (sort?.field === UnitSortField.CREATED_AT) {
      order.createdAt = sort.direction || SortDirection.DESC;
    } else if (sort?.field === UnitSortField.PRICE) {
      order.price = sort.direction || SortDirection.ASC;
    } else {
      // Default order
      order.createdAt = SortDirection.DESC;
    }

    const [units, count] = await this.unitRepository.findAndCount({
      where,
      relations: ['project', 'project.developer', 'amenities'],
      take: limit,
      skip: offset,
      order,
    });

    // Load ordered images for each unit
    for (const unit of units) {
      unit.images = await this.getUnitImages(unit.id);
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

  // Generate embedding for a unit based on its properties
  private async generateUnitEmbedding(unit: Unit): Promise<number[] | null> {
    try {
      // Get OpenAI API key from environment variables
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');

      if (!apiKey) {
        console.warn(
          'OpenAI API key not configured. Skipping embedding generation.'
        );
        return null;
      }

      // Create a text representation of the unit for embedding
      const unitText = this.getUnitTextForEmbedding(unit);

      // Call OpenAI API to generate embedding
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-small',
          input: unitText,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Extract embedding from response
      const embedding = response.data.data[0].embedding;
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      return null;
    }
  }

  // Create a text representation of the unit for embedding
  private getUnitTextForEmbedding(unit: Unit): string {
    const parts = [
      `Name: ${unit.name}`,
      `Number: ${unit.number}`,
      `Floor: ${unit.floor}`,
      `Rooms: ${unit.rooms}`,
      `Bathrooms: ${unit.bathrooms}`,
      `Floor Area: ${unit.floorArea} square meters`,
      `Price: ${unit.price}`,
    ];

    if (unit.description) {
      parts.push(`Description: ${unit.description}`);
    }

    if (unit.project?.name) {
      parts.push(`Project: ${unit.project.name}`);
    }

    if (unit.amenities && unit.amenities.length > 0) {
      const amenitiesText = unit.amenities
        .map((amenity) => amenity.name)
        .join(', ');
      parts.push(`Amenities: ${amenitiesText}`);
    }

    return parts.join(' ');
  }

  // Find similar units based on vector similarity
  async findSimilarUnits(unitId: string, limit = 5): Promise<Unit[]> {
    // Check if Typesense is enabled
    const useTypesense = this.configService.get<string>('USE_TYPESENSE') === 'true';
    
    if (useTypesense) {
      try {
        // First check if the units collection has an embedding field
        const collectionInfo = await this.typesenseService.getClient().collections('units').retrieve();
        const hasEmbeddingField = collectionInfo.fields.some(field => field.name === 'embedding');
        
        if (!hasEmbeddingField) {
          this.logger.warn('No embedding field found in Typesense collection, falling back to database similarity');
          return this.findSimilarUnitsFromDatabase(unitId, limit);
        }
        
        // Use Typesense vector search to find similar units
        const searchParams = {
          q: '*',
          vector_query: `embedding:([], id: ${unitId})`,
          per_page: limit,
          exclude_fields: 'embedding'
        };
        
        const searchResults = await this.typesenseService.searchUnits(searchParams);
        
        // Extract unit IDs from search results
        const unitIds = searchResults.hits.map(hit => hit.document.id);
        
        if (unitIds.length === 0) {
          // Fall back to database similarity if no results
          return this.findSimilarUnitsFromDatabase(unitId, limit);
        }
        
        // Fetch full unit data with relations
        const units = await this.unitRepository.find({
          where: { id: In(unitIds) },
          relations: ['project', 'project.developer', 'amenities'],
        });
        
        // Sort units in the same order as search results
        const unitMap = new Map(units.map(unit => [unit.id, unit]));
        const sortedUnits = unitIds
          .map(id => unitMap.get(id))
          .filter((unit): unit is Unit => unit !== undefined);
        
        // Load images for each unit
        for (const unit of sortedUnits) {
          unit.images = await this.getUnitImages(unit.id);
        }
        
        return sortedUnits;
      } catch (error) {
        this.logger.error(`Error finding similar units with Typesense: ${error.message}`);
        // Fall back to database similarity
        return this.findSimilarUnitsFromDatabase(unitId, limit);
      }
    }
    
    // Use database similarity if Typesense is disabled
    return this.findSimilarUnitsFromDatabase(unitId, limit);
  }
  
  // Database fallback for finding similar units
  private async findSimilarUnitsFromDatabase(unitId: string, limit = 5): Promise<Unit[]> {
    // Use vector similarity search with our SQL function
    const similarUnits = await this.unitRepository.query(
      `
        SELECT u.* 
        FROM units u
        WHERE u.id IN (
          SELECT id FROM match_similar_units($1)
        )
        ORDER BY (
          SELECT similarity 
          FROM match_similar_units($1) m 
          WHERE m.id = u.id
        ) DESC
    `,
      [unitId]
    );

    // Load relations data for each similar unit
    const detailedUnits = [];
    for (const similarUnit of similarUnits) {
      const detailedUnit = await this.unitRepository.findOne({
        where: { id: similarUnit.id },
        relations: ['project', 'project.developer', 'amenities'],
      });

      if (detailedUnit) {
        detailedUnit.images = await this.getUnitImages(detailedUnit.id);
        detailedUnits.push(detailedUnit);
      }
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
      const project = await this.projectService.findOne(createUnitInput.projectId);
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

      await queryRunner.commitTransaction();

      // Get full unit details
      const fullUnit = await this.findOne(savedUnit.id);
      

      // Emit event for unit creation
      this.eventEmitter.emit(
        'unit.created',
        new UnitCreatedEvent(savedUnit.id)
      );

      return fullUnit;
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
        if (key !== 'id' && key !== 'amenityIds' && key !== 'images') {
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

      // Save updates
      await queryRunner.manager.save(unit);
      await queryRunner.commitTransaction();

      // Get full updated unit
      const updatedUnit = await this.findOne(id);
      
      // Emit event for unit update
      this.eventEmitter.emit('unit.updated', new UnitUpdatedEvent(id));

      return updatedUnit;
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
    // Find the unit first to return it later
    const unit = await this.findOne(id);
    
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Delete from the database
    await this.unitRepository.delete(id);

    // Emit event for unit deletion
    this.eventEmitter.emit('unit.deleted', new UnitDeletedEvent(id));

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

  // New method to update unit embedding directly
  async updateUnitEmbedding(unitId: string): Promise<Unit> {
    const unit = await this.findOne(unitId);

    // Load related entities for embedding generation
    unit.project = await this.projectService.findOne(unit.projectId);
    unit.amenities = await this.getUnitAmenities(unitId);

    // Generate embedding
    unit.embedding = await this.generateUnitEmbedding(unit);

    // Save the unit with updated embedding
    if (unit.embedding) {
      try {
        // Format the embedding as a proper PostgreSQL array
        // PostgreSQL vector type expects format: [0.1,0.2,0.3]
        const formattedEmbedding = `[${unit.embedding.join(',')}]`;

        // Update directly via query to ensure proper vector format
        await this.dataSource.query(
          `UPDATE units SET embedding = $1::vector WHERE id = $2`,
          [formattedEmbedding, unitId]
        );

        // Refresh the unit object
        return this.findOne(unitId);
      } catch (error) {
        console.error(
          `Error updating embedding for unit ${unitId}:`,
          error.message
        );
        return unit;
      }
    }

    return this.unitRepository.save(unit);
  }
}
