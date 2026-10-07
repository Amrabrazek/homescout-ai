import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypesenseService } from './typesense.service';

@Module({
  imports: [ConfigModule],
  providers: [TypesenseService],
  exports: [TypesenseService],
})
export class TypesenseModule {}
