import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Developer } from '../../common/entities/developer.entity';
import { DeveloperResolver } from './developer.resolver';
import { DeveloperService } from './developer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Developer])],
  providers: [DeveloperResolver, DeveloperService],
  exports: [DeveloperService],
})
export class DeveloperModule {}
