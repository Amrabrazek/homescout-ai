import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from '../../common/entities/image.entity';
import { ImageResolver } from './image.resolver';
import { ImageService } from './image.service';

@Module({
  imports: [TypeOrmModule.forFeature([Image])],
  providers: [ImageResolver, ImageService],
  exports: [ImageService],
})
export class ImageModule {}
