import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';

// Modules
import { DeveloperModule } from './modules/developer/developer.module';
import { ProjectModule } from './modules/project/project.module';
import { UnitModule } from './modules/unit/unit.module';
import { ImageModule } from './modules/image/image.module';
import { AmenityModule } from './modules/amenity/amenity.module';
import { TypesenseModule } from './common/typesense/typesense.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME', 'supabase_admin'),
        password: configService.get(
          'DB_PASSWORD',
          'your-super-secret-and-long-postgres-password'
        ),
        database: configService.get('DB_NAME', 'postgres'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: false,
      }),
    }),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
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
  ],
})
export class AppModule {}
