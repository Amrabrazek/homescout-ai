import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../../common/entities/unit.entity';
import { UnitImage } from '../../common/entities/unit-image.entity';
import { ProjectModule } from '../project/project.module';
import { AmenityModule } from '../amenity/amenity.module';
import { ImageModule } from '../image/image.module';
import { UnitResolver } from './unit.resolver';
import { UnitService } from './unit.service';
import { UnitEmbeddingListener } from './unit-embedding.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unit, UnitImage]),
    ProjectModule,
    AmenityModule,
    ImageModule,
  ],
  providers: [UnitResolver, UnitService, UnitEmbeddingListener],
  exports: [UnitService],
})
export class UnitModule {}
