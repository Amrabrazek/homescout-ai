import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Amenity } from '../../common/entities/amenity.entity';
import { AmenityResolver } from './amenity.resolver';
import { AmenityService } from './amenity.service';

@Module({
  imports: [TypeOrmModule.forFeature([Amenity])],
  providers: [AmenityResolver, AmenityService],
  exports: [AmenityService],
})
export class AmenityModule {} 