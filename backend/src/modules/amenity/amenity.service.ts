import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Amenity } from '../../common/entities/amenity.entity';
import { CreateAmenityInput } from './dto/create-amenity.input';

@Injectable()
export class AmenityService {
  constructor(
    @InjectRepository(Amenity)
    private amenityRepository: Repository<Amenity>,
  ) {}

  async findAll(): Promise<Amenity[]> {
    return this.amenityRepository.find();
  }

  async findOne(id: string): Promise<Amenity> {
    const amenity = await this.amenityRepository.findOne({
      where: { id },
    });
    
    if (!amenity) {
      throw new NotFoundException(`Amenity with ID ${id} not found`);
    }
    
    return amenity;
  }

  async findByIds(ids: string[]): Promise<Amenity[]> {
    return this.amenityRepository.findByIds(ids);
  }

  async create(createAmenityInput: CreateAmenityInput): Promise<Amenity> {
    const amenity = this.amenityRepository.create(createAmenityInput);
    return this.amenityRepository.save(amenity);
  }
} 