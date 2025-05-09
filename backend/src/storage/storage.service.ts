import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName = 'images';

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY')
    );
    this.initBucket();
  }

  private async initBucket() {
    try {
      // Check if bucket exists, if not create it
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets.some(
        (bucket) => bucket.name === this.bucketName
      );

      if (!bucketExists) {
        const { error } = await this.supabase.storage.createBucket(
          this.bucketName,
          {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          }
        );

        if (error) {
          this.logger.error(`Error creating bucket: ${error.message}`);
        } else {
          this.logger.log(`Bucket '${this.bucketName}' created successfully`);
        }
      }
    } catch (error) {
      this.logger.error(`Error initializing bucket: ${error.message}`);
    }
  }

  async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    try {
      const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      const fullPath = path ? `${path}/${uniqueFilename}` : uniqueFilename;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fullPath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Error uploading file: ${error.message}`);
        throw new Error(`File upload failed: ${error.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.bucketName).getPublicUrl(fullPath);

      return publicUrl;
    } catch (error) {
      this.logger.error(`Error in uploadFile: ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async getPublicUrl(path: string): Promise<string> {
    const {
      data: { publicUrl },
    } = this.supabase.storage.from(this.bucketName).getPublicUrl(path);

    return publicUrl;
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        this.logger.error(`Error deleting file: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error in deleteFile: ${error.message}`);
      return false;
    }
  }

  async listFiles(path: string = ''): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path);

      if (error) {
        this.logger.error(`Error listing files: ${error.message}`);
        return [];
      }

      return data.map((file) => file.name);
    } catch (error) {
      this.logger.error(`Error in listFiles: ${error.message}`);
      return [];
    }
  }
}
