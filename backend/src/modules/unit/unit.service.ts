import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitImage)
    private unitImageRepository: Repository<UnitImage>,
    private projectService: ProjectService,
    private amenityService: AmenityService,
    private imageService: ImageService
  ) {}

  async findAll(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<Unit[]> {
    const where: any = {};

    console.log('filter', filter);
    console.log('sort', sort);

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
      const images = await this.imageService.findByIds(imageIds);

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

    return this.findOne(savedUnit.id);
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

    return this.findOne(updatedUnit.id);
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

  async delete(id: string): Promise<Unit> {
    const unit = await this.findOne(id);
    // Clone the unit before removing it to return a valid object
    const unitToReturn = { ...unit };
    await this.unitRepository.remove(unit);
    return unitToReturn;
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
