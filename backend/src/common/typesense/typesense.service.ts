import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Typesense from 'typesense';

@Injectable()
export class TypesenseService implements OnModuleInit {
  private client: any;
  private readonly logger = new Logger(TypesenseService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Typesense.Client({
      nodes: [
        {
          host: this.configService.get<string>('TYPESENSE_HOST', 'typesense'),
          port: this.configService.get<number>('TYPESENSE_PORT', 8108),
          protocol: this.configService.get<string>('TYPESENSE_PROTOCOL', 'http'),
        },
      ],
      apiKey: this.configService.get<string>('TYPESENSE_API_KEY', 'xyz'),
      connectionTimeoutSeconds: 2,
    });
  }

  async onModuleInit() {
    try {
      // Check if we can connect to Typesense
      const health = await this.client.health.retrieve();
        this.logger.log(`Connected to Typesense: ${JSON.stringify(health)}`);
        console.log(`Connected to Typesense: ${JSON.stringify(health)}`);
        console.log('health', health);
      
      // Initialize collections
      await this.initializeCollections();
    } catch (error) {
      this.logger.error(`Failed to connect to Typesense: ${error.message}`);
    }
  }

  async initializeCollections() {
    try {
      // Check if units collection exists, if not create it
      try {
        await this.client.collections('units').retrieve();
        this.logger.log('Units collection already exists');
      } catch (error) {
        if (error.httpStatus === 404) {
          // Collection doesn't exist, create it
          const schema = {
            name: 'units',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
              { name: 'number', type: 'string' },
              { name: 'description', type: 'string', optional: true },
              { name: 'floor', type: 'int32', facet: true },
              { name: 'rooms', type: 'int32', facet: true },
              { name: 'bathrooms', type: 'int32', facet: true },
              { name: 'floorArea', type: 'float', facet: true },
              { name: 'price', type: 'float', facet: true },
              { name: 'projectId', type: 'string', facet: true },
              { name: 'projectName', type: 'string', facet: true },
              { name: 'developerName', type: 'string', facet: true },
              { name: 'amenityIds', type: 'string[]', optional: true, facet: true },
              { name: 'amenityNames', type: 'string[]', optional: true, facet: true },
              { name: 'imageUrls', type: 'string[]', optional: true },
              { name: 'createdAt', type: 'int64' }
            ],
            default_sorting_field: 'createdAt'
          };
          await this.client.collections().create(schema);
          this.logger.log('Units collection created');
        } else {
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Typesense collections: ${error.message}`);
      throw error;
    }
  }

  async indexUnit(unit: any): Promise<any> {
    try {
      // Prepare the document for Typesense
      const document = this.mapUnitToTypesenseDocument(unit);
      return await this.client.collections('units').documents().upsert(document);
    } catch (error) {
      this.logger.error(`Failed to index unit: ${error.message}`);
      throw error;
    }
  }

  async deleteUnit(unitId: string): Promise<any> {
    try {
      return await this.client.collections('units').documents(unitId).delete();
    } catch (error) {
      this.logger.error(`Failed to delete unit: ${error.message}`);
      throw error;
    }
  }

  async searchUnits(params: any): Promise<any> {
    try {
      return await this.client.collections('units').documents().search(params);
    } catch (error) {
      this.logger.error(`Failed to search units: ${error.message}`);
      throw error;
    }
  }

  async importUnits(units: any[]): Promise<any> {
    try {
      const documents = units.map(unit => this.mapUnitToTypesenseDocument(unit));
      return await this.client.collections('units').documents().import(documents);
    } catch (error) {
      this.logger.error(`Failed to import units: ${error.message}`);
      throw error;
    }
  }

  private mapUnitToTypesenseDocument(unit: any): any {
    return {
      id: unit.id,
      name: unit.name,
      number: unit.number,
      description: unit.description || '',
      floor: unit.floor,
      rooms: unit.rooms,
      bathrooms: unit.bathrooms,
      floorArea: parseFloat(unit.floorArea),
      price: parseFloat(unit.price),
      projectId: unit.projectId || unit.project?.id,
      projectName: unit.project?.name || '',
      developerName: unit.project?.developer?.name || '',
      amenityIds: unit.amenities?.map(a => a.id) || [],
      amenityNames: unit.amenities?.map(a => a.name) || [],
      imageUrls: unit.images?.map(img => img.url) || [],
      createdAt: new Date(unit.createdAt).getTime()
    };
  }

  getClient() {
    return this.client;
  }
} 