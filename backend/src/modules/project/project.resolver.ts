import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Int,
} from '@nestjs/graphql';
import { Developer } from '../../common/entities/developer.entity';
import { Project } from '../../common/entities/project.entity';
import { DeveloperService } from '../developer/developer.service';
import { CreateProjectInput } from './dto/create-project.input';
import { ProjectService } from './project.service';

@Resolver(() => Project)
export class ProjectResolver {
  constructor(
    private projectService: ProjectService,
    private developerService: DeveloperService
  ) {}

  @Query(() => [Project], { name: 'projects' })
  async findAll(
    @Args('searchTerm', { nullable: true }) searchTerm?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('developerId', { type: () => String, nullable: true })
    developerId?: string
  ): Promise<Project[]> {
    return this.projectService.findAll(searchTerm, limit, offset, developerId);
  }

  @Query(() => Project, { name: 'project' })
  findOne(@Args('id') id: string): Promise<Project> {
    return this.projectService.findOne(id);
  }

  @Mutation(() => Project)
  createProject(
    @Args('createProjectInput') createProjectInput: CreateProjectInput
  ): Promise<Project> {
    return this.projectService.create(createProjectInput);
  }

  @ResolveField(() => Developer)
  async developer(@Parent() project: Project): Promise<Developer> {
    if (project.developer) return project.developer;
    const { developerId } = project;
    return this.developerService.findOne(developerId);
  }
}
