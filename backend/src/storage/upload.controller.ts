import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { isValidFileSize, isValidFileType } from '../utils/types';

@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!isValidFileType(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP, GIF'
      );
    }

    if (!isValidFileSize(file.size)) {
      throw new BadRequestException('File too large. Maximum size: 10MB');
    }

    const path = 'property-images';
    const publicUrl = await this.storageService.uploadFile(file, path);

    return {
      url: publicUrl,
      path: `${path}/${file.originalname}`,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
