import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Developer } from '../../common/entities/developer.entity';
import { CreateDeveloperInput } from './dto/create-developer.input';

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>
  ) {}

  async findAll(): Promise<Developer[]> {
    return this.developerRepository.find({ relations: ['projects'] });
  }

  async findOne(id: string): Promise<Developer> {
    const developer = await this.developerRepository.findOne({
      where: { id },
      relations: ['projects'],
    });

    if (!developer) {
      throw new NotFoundException(`Developer with ID ${id} not found`);
    }

    return developer;
  }

  async create(createDeveloperInput: CreateDeveloperInput): Promise<Developer> {
    const developer = this.developerRepository.create(createDeveloperInput);
    return this.developerRepository.save(developer);
  }
}
