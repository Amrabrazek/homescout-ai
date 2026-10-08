import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

export interface StoredObject {
  key: string;
  url: string;
}

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.get('S3_BUCKET', 'images');
    this.publicUrl = config
      .get('S3_PUBLIC_URL', `http://localhost:9000/${this.bucket}`)
      .replace(/\/$/, '');
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT', 'http://localhost:9000'),
      region: config.get('S3_REGION', 'us-east-1'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', 'homescout'),
        secretAccessKey: config.get('S3_SECRET_KEY', 'homescout-secret'),
      },
    });
  }

  async storeImage(file: Express.Multer.File): Promise<StoredObject> {
    const extension = extname(file.originalname).toLowerCase() || '.jpg';
    const key = `units/${randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return { key, url: `${this.publicUrl}/${key}` };
  }
}
