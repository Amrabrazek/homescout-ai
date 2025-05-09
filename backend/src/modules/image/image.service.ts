import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from '../../common/entities/image.entity';
import { CreateImageInput } from './dto/create-image.input';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(Image)
    private imageRepository: Repository<Image>
  ) {}

  async findAll(): Promise<Image[]> {
    return this.imageRepository.find();
  }

  async findOne(id: string): Promise<Image> {
    const image = await this.imageRepository.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  async findByIds(ids: string[]): Promise<Image[]> {
    return this.imageRepository.findByIds(ids);
  }

  async create(createImageInput: CreateImageInput): Promise<Image> {
    const image = this.imageRepository.create(createImageInput);
    return this.imageRepository.save(image);
  }
}
