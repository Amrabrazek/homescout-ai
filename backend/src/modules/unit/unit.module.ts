import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../../common/entities/unit.entity';
import { UnitImage } from '../../common/entities/unit-image.entity';
import { ProjectModule } from '../project/project.module';
import { AmenityModule } from '../amenity/amenity.module';
import { ImageModule } from '../image/image.module';
import { UnitResolver } from './unit.resolver';
import { UnitService } from './unit.service';
import { SyncModule } from '../sync/sync.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unit, UnitImage]),
    ProjectModule,
    AmenityModule,
    ImageModule,
    SyncModule,
    EmbeddingModule,
    SearchModule,
  ],
  providers: [UnitResolver, UnitService],
  exports: [UnitService],
})
export class UnitModule {}
