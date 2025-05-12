import { Injectable, NotFoundException } from '@nestjs/common';
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
import { ImageService } from '../image/image.service';
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

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitImage)
    private unitImageRepository: Repository<UnitImage>,
    private projectService: ProjectService,
    private amenityService: AmenityService,
    private imageService: ImageService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource
  ) {}

  async findAll(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<Unit[]> {
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

    const units = await this.unitRepository.find({
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

    return units;
  }

  async findAllWithCount(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<[Unit[], number]> {
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
      relations: ['project', 'amenities', 'images'],
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
          model: 'text-embedding-ada-002',
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
    const { amenityIds, imageIds, ...unitData } = createUnitInput;

    // Verify project exists
    await this.projectService.findOne(unitData.projectId);

    // Create the unit first
    const unit = this.unitRepository.create(unitData);
    const savedUnit = await this.unitRepository.save(unit);

    // Add amenities if provided
    if (amenityIds && amenityIds.length > 0) {
      const amenities = await this.amenityService.findByIds(amenityIds);
      savedUnit.amenities = amenities;
      await this.unitRepository.save(savedUnit);
    }

    // Add images if provided with order
    if (imageIds && imageIds.length > 0) {
      // Clear any existing unit_images entries
      await this.unitImageRepository.delete({ unitId: savedUnit.id });

      // Create new unit_images entries with order
      const unitImages = imageIds.map((imageId, index) => {
        const unitImage = new UnitImage();
        unitImage.unitId = savedUnit.id;
        unitImage.imageId = imageId;
        unitImage.order = index + 1; // Order starts from 1
        return unitImage;
      });

      // Save all unit_images entries
      await this.unitImageRepository.save(unitImages);
    }

    // Emit event for embedding generation
    const completeUnit = await this.findOne(savedUnit.id);
    console.log('completeUnit', completeUnit);
    this.eventEmitter.emit('unit.created', new UnitCreatedEvent(completeUnit));

    return completeUnit;
  }

  async update(id: string, updateUnitInput: UpdateUnitInput): Promise<Unit> {
    // First, check if unit exists
    const existingUnit = await this.findOne(id);

    if (!existingUnit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    const { amenityIds, imageIds, ...unitData } = updateUnitInput;

    // If projectId is being updated, verify the new project exists
    if (unitData.projectId) {
      await this.projectService.findOne(unitData.projectId);
    }

    // Update the unit properties
    this.unitRepository.merge(existingUnit, unitData);
    const updatedUnit = await this.unitRepository.save(existingUnit);

    // Update amenities if provided
    if (amenityIds && amenityIds.length > 0) {
      const amenities = await this.amenityService.findByIds(amenityIds);
      updatedUnit.amenities = amenities;
      await this.unitRepository.save(updatedUnit);
    }

    // Update images if provided with order
    if (imageIds && imageIds.length > 0) {
      // Clear any existing unit_images entries
      await this.unitImageRepository.delete({ unitId: updatedUnit.id });

      // Create new unit_images entries with order
      const unitImages = imageIds.map((imageId, index) => {
        const unitImage = new UnitImage();
        unitImage.unitId = updatedUnit.id;
        unitImage.imageId = imageId;
        unitImage.order = index + 1; // Order starts from 1
        return unitImage;
      });

      // Save all unit_images entries
      await this.unitImageRepository.save(unitImages);
    }

    // Emit event for embedding update
    const completeUnit = await this.findOne(updatedUnit.id);
    this.eventEmitter.emit('unit.updated', new UnitUpdatedEvent(completeUnit));

    return completeUnit;
  }

  async delete(id: string): Promise<Unit> {
    const unit = await this.findOne(id);
    // Clone the unit before removing it to return a valid object
    const unitToReturn = { ...unit };
    await this.unitRepository.remove(unit);

    // Emit delete event
    this.eventEmitter.emit('unit.deleted', new UnitDeletedEvent(unitToReturn));

    return unitToReturn;
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

    console.log('unit', unit);

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
