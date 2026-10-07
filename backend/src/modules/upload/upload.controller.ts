import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoredObject, UploadService } from './upload.service';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('images')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp|gif|avif)$/,
          }),
        ],
      })
    )
    file: Express.Multer.File
  ): Promise<StoredObject> {
    return this.uploadService.storeImage(file);
  }
}
