import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Raw } from 'typeorm';
import { Project } from '../../common/entities/project.entity';
import { DeveloperService } from '../developer/developer.service';
import { CreateProjectInput } from './dto/create-project.input';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private developerService: DeveloperService
  ) {}

  async findAll(
    searchTerm?: string,
    limit?: number,
    offset?: number,
    developerId?: string
  ): Promise<Project[]> {
    const where: any = {};

    if (searchTerm) {
      // Search in project name or developer name
      where.name = Raw((alias) => `LOWER(${alias}) LIKE LOWER(:searchTerm)`, {
        searchTerm: `%${searchTerm}%`,
      });

      // Use query builder to search in related developer's name
      return this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.developer', 'developer')
        .where(developerId ? 'developer.id = :developerId' : '1=1', {
          developerId,
        })
        .andWhere(
          '(LOWER(project.name) LIKE LOWER(:searchTerm) OR LOWER(developer.name) LIKE LOWER(:searchTerm))',
          { searchTerm: `%${searchTerm}%` }
        )
        .take(limit && limit > 0 ? limit : undefined)
        .skip(offset && offset > 0 ? offset : 0)
        .orderBy('project.name', 'ASC')
        .getMany();
    }

    if (developerId) {
      where.developerId = developerId;
    }

    const take = limit && limit > 0 ? limit : undefined;
    const skip = offset && offset > 0 ? offset : 0;

    return this.projectRepository.find({
      where,
      relations: ['developer'],
      take,
      skip,
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['developer'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async create(createProjectInput: CreateProjectInput): Promise<Project> {
    // Verify developer exists
    await this.developerService.findOne(createProjectInput.developerId);

    const project = this.projectRepository.create(createProjectInput);
    return this.projectRepository.save(project);
  }
}
