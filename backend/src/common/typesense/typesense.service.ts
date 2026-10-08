import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Typesense from 'typesense';
import { Unit } from '../entities/unit.entity';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../../modules/embedding/embedding.provider';

export const UNITS_COLLECTION = 'units';

export interface UnitDocument {
  id: string;
  name: string;
  number: string;
  description: string;
  floor: number;
  rooms: number;
  bathrooms: number;
  floorArea: number;
  price: number;
  propertyType?: string;
  finishing?: string;
  view?: string;
  deliveryYear?: number;
  projectId: string;
  projectName: string;
  developerName: string;
  area?: string;
  city?: string;
  region?: string;
  amenityIds: string[];
  amenityNames: string[];
  imageUrls: string[];
  createdAt: number;
  embedding?: number[];
}

export function toUnitDocument(
  unit: Unit,
  imageUrls: string[],
  embedding?: number[]
): UnitDocument {
  const project = unit.project;
  return {
    id: unit.id,
    name: unit.name,
    number: unit.number ?? '',
    description: unit.description ?? '',
    floor: unit.floor,
    rooms: unit.rooms,
    bathrooms: unit.bathrooms,
    floorArea: Number(unit.floorArea),
    price: Number(unit.price),
    propertyType: unit.propertyType ?? undefined,
    finishing: unit.finishing ?? undefined,
    view: unit.view ?? undefined,
    deliveryYear: unit.deliveryYear ?? undefined,
    projectId: unit.projectId,
    projectName: project?.name ?? '',
    developerName: project?.developer?.name ?? '',
    area: project?.area ?? undefined,
    city: project?.city ?? undefined,
    region: project?.region ?? undefined,
    amenityIds: unit.amenities?.map((a) => a.id) ?? [],
    amenityNames: unit.amenities?.map((a) => a.name) ?? [],
    imageUrls,
    createdAt: new Date(unit.createdAt).getTime(),
    embedding,
  };
}

@Injectable()
export class TypesenseService implements OnModuleInit {
  private readonly client: any;
  private readonly logger = new Logger(TypesenseService.name);
  private collectionReady?: Promise<void>;

  constructor(
    configService: ConfigService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider
  ) {
    this.client = new Typesense.Client({
      nodes: [
        {
          host: configService.get<string>('TYPESENSE_HOST', 'localhost'),
          port: Number(configService.get('TYPESENSE_PORT', 8108)),
          protocol: configService.get<string>('TYPESENSE_PROTOCOL', 'http'),
        },
      ],
      apiKey: configService.get<string>('TYPESENSE_API_KEY', 'xyz'),
      connectionTimeoutSeconds: 10,
      numRetries: 1,
      logLevel: 'error',
    });
  }

  async onModuleInit() {
    try {
      await this.ensureCollection();
    } catch (error) {
      this.logger.warn(`Typesense unavailable: ${error.message}`);
    }
  }

  /**
   * Creates the collection, or recreates it when its vector size no longer
   * matches EMBEDDING_MODEL. The index is a projection, so `npm run reindex` refills it.
   */
  ensureCollection(): Promise<void> {
    this.collectionReady ??= this.createOrMigrateCollection().catch((error) => {
      this.collectionReady = undefined;
      throw error;
    });
    return this.collectionReady;
  }

  private async createOrMigrateCollection(): Promise<void> {
    const existing = await this.client
      .collections(UNITS_COLLECTION)
      .retrieve()
      .catch((error) => {
        if (error.httpStatus === 404) return null;
        throw error;
      });

    if (existing) {
      const embedding = existing.fields.find((f) => f.name === 'embedding');
      if (embedding?.num_dim === this.embeddings.dimensions) return;
      this.logger.warn(
        `Collection "${UNITS_COLLECTION}" has ${embedding?.num_dim ?? 'no'} vector dims, ` +
          `${this.embeddings.model} needs ${this.embeddings.dimensions}; recreating it. Run "npm run reindex" to refill it.`
      );
      await this.client.collections(UNITS_COLLECTION).delete();
    }

    await this.client.collections().create(this.schema());
    this.logger.log(
      `Created collection "${UNITS_COLLECTION}" (${this.embeddings.model}, ${this.embeddings.dimensions} dims)`
    );
  }

  private schema() {
    return {
      name: UNITS_COLLECTION,
      default_sorting_field: 'createdAt',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'number', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'floor', type: 'int32', facet: true },
        { name: 'rooms', type: 'int32', facet: true },
        { name: 'bathrooms', type: 'int32', facet: true },
        { name: 'floorArea', type: 'float', facet: true },
        { name: 'price', type: 'float', facet: true },
        { name: 'propertyType', type: 'string', facet: true, optional: true },
        { name: 'finishing', type: 'string', facet: true, optional: true },
        { name: 'view', type: 'string', facet: true, optional: true },
        { name: 'deliveryYear', type: 'int32', facet: true, optional: true },
        { name: 'projectId', type: 'string', facet: true },
        { name: 'projectName', type: 'string', facet: true },
        { name: 'developerName', type: 'string', facet: true },
        { name: 'area', type: 'string', facet: true, optional: true },
        { name: 'city', type: 'string', facet: true, optional: true },
        { name: 'region', type: 'string', facet: true, optional: true },
        { name: 'amenityIds', type: 'string[]', facet: true, optional: true },
        { name: 'amenityNames', type: 'string[]', facet: true, optional: true },
        { name: 'imageUrls', type: 'string[]', index: false, optional: true },
        { name: 'createdAt', type: 'int64' },
        {
          name: 'embedding',
          type: 'float[]',
          num_dim: this.embeddings.dimensions,
          optional: true,
        },
      ],
    };
  }

  async upsertDocuments(documents: UnitDocument[]): Promise<void> {
    if (documents.length === 0) return;
    const results = await this.withCollection<
      { success: boolean; error?: string }[]
    >((units) =>
      units
        .documents()
        .import(documents, { action: 'upsert' })
        .catch((error) => {
          // The client throws ImportError when some documents fail; surface those details.
          if (error.importResults) return error.importResults;
          throw error;
        })
    );
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      throw new Error(
        `Typesense rejected ${failed.length} document(s): ${failed[0].error}`
      );
    }
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const filter = `id:[${ids.map((id) => `\`${id}\``).join(',')}]`;
    await this.withCollection((units) =>
      units.documents().delete({ filter_by: filter })
    );
  }

  /** Re-creates the collection once if Typesense lost it (e.g. restarted without its volume). */
  private async withCollection<T>(fn: (units: any) => Promise<T>): Promise<T> {
    await this.ensureCollection();
    try {
      return await fn(this.client.collections(UNITS_COLLECTION));
    } catch (error) {
      if (error.httpStatus !== 404) throw error;
      this.collectionReady = undefined;
      await this.ensureCollection();
      return fn(this.client.collections(UNITS_COLLECTION));
    }
  }

  /** Runs one search through multi_search, which is POST, so long query vectors fit. */
  async search(params: Record<string, unknown>): Promise<any> {
    const { results } = await this.client.multiSearch.perform(
      { searches: [{ collection: UNITS_COLLECTION, ...params }] },
      {}
    );
    const [result] = results;
    if (result.error) {
      throw new Error(`Typesense search failed: ${result.error}`);
    }
    return result;
  }

  async listDocumentIds(): Promise<string[]> {
    const jsonl: string = await this.client
      .collections(UNITS_COLLECTION)
      .documents()
      .export({ include_fields: 'id' });
    return jsonl
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line).id);
  }
}
