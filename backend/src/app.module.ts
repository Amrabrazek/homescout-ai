import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';
import { databaseOptions } from './config/database.config';
import { UploadModule } from './modules/upload/upload.module';

// Modules
import { DeveloperModule } from './modules/developer/developer.module';
import { ProjectModule } from './modules/project/project.module';
import { UnitModule } from './modules/unit/unit.module';
import { ImageModule } from './modules/image/image.module';
import { AmenityModule } from './modules/amenity/amenity.module';
import { TypesenseModule } from './common/typesense/typesense.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions() }),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile:
        process.env.NODE_ENV === 'production'
          ? true
          : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),

    // Feature Modules
    DeveloperModule,
    ProjectModule,
    UnitModule,
    ImageModule,
    AmenityModule,
    TypesenseModule,
    SearchModule,
    UploadModule,
  ],
})
export class AppModule {}
