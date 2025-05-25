import { Injectable, Logger } from '@nestjs/common';
import { TypesenseService } from '../../common/typesense/typesense.service';
import { ConfigService } from '@nestjs/config';
import { UnitFilterInput } from '../unit/dto/unit-filter.input';
import {
  UnitSortInput,
  UnitSortField,
  SortDirection,
} from '../unit/dto/unit-sort.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../../common/entities/unit.entity';
import {
  SearchUnitsResponse,
  SearchUnitDocument,
  FacetCountResponse,
} from './search.model';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly typesenseService: TypesenseService,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>
  ) {}

  async searchUnits(
    filter?: UnitFilterInput,
    sort?: UnitSortInput,
    limit?: number,
    offset?: number
  ): Promise<SearchUnitsResponse> {
    try {
      // Build search parameters for Typesense
      const searchParams: any = {
        q: filter?.searchTerm || '*',
        query_by:
          'name,number,description,projectName,developerName,amenityNames',
        filter_by: '',
        sort_by: '',
        page: offset ? Math.floor(offset / (limit || 20)) + 1 : 1,
        per_page: limit || 20,
        facet_by:
          'projectId,rooms,floor,price,floorArea,amenityNames,amenityIds,projectName,developerName',
        num_typos: 1,
        prefix: true,
        prioritize_exact_match: true,
        prioritize_token_position: true,
        include_fields: '*', // Include all fields to avoid additional DB queries
      };

      // Add filtering logic
      const filterConditions = [];

      if (filter?.projectIds && filter.projectIds.length > 0) {
        const projectFilter = filter.projectIds
          .map((id) => `projectId:=${id}`)
          .join(' || ');
        filterConditions.push(`(${projectFilter})`);
      }

      if (filter?.amenityIds && filter.amenityIds.length > 0) {
        // Use the amenityIds directly with Typesense filtering
        const amenityFilter = filter.amenityIds
          .map((id) => `amenityIds:=${id}`)
          .join(' && ');
        filterConditions.push(`(${amenityFilter})`);
      }

      if (filter?.minRooms !== undefined) {
        filterConditions.push(`rooms:>=${filter.minRooms}`);
      }
      if (filter?.maxRooms !== undefined) {
        filterConditions.push(`rooms:<=${filter.maxRooms}`);
      }

      if (filter?.minPrice !== undefined) {
        filterConditions.push(`price:>=${filter.minPrice}`);
      }
      if (filter?.maxPrice !== undefined) {
        filterConditions.push(`price:<=${filter.maxPrice}`);
      }

      if (filter?.minFloorArea !== undefined) {
        filterConditions.push(`floorArea:>=${filter.minFloorArea}`);
      }
      if (filter?.maxFloorArea !== undefined) {
        filterConditions.push(`floorArea:<=${filter.maxFloorArea}`);
      }

      // Combine all filter conditions
      if (filterConditions.length > 0) {
        searchParams.filter_by = filterConditions.join(' && ');
      }

      // Set sort options
      if (sort?.field === UnitSortField.NAME) {
        searchParams.sort_by = `name:${sort.direction === SortDirection.DESC ? 'desc' : 'asc'}`;
      } else if (sort?.field === UnitSortField.PRICE) {
        searchParams.sort_by = `price:${sort.direction === SortDirection.DESC ? 'desc' : 'asc'}`;
      } else if (sort?.field === UnitSortField.CREATED_AT) {
        searchParams.sort_by = `createdAt:${sort.direction === SortDirection.DESC ? 'desc' : 'asc'}`;
      } else {
        // Default order is by createdAt desc
        searchParams.sort_by = 'createdAt:desc';
      }

      this.logger.debug(
        `Typesense search params: ${JSON.stringify(searchParams)}`
      );
      const searchResults =
        await this.typesenseService.searchUnits(searchParams);

      // Total found from Typesense
      const total = searchResults.found;

      // Extract facet counts from the search results
      const facetCounts = searchResults.facet_counts || [];

      // Map search results to our dedicated search model
      if (searchResults.hits && searchResults.hits.length > 0) {
        const items: SearchUnitDocument[] = searchResults.hits.map((hit) => {
          const doc = hit.document;

          // Map to our SearchUnitDocument model
          const searchUnit: SearchUnitDocument = {
            id: doc.id,
            name: doc.name,
            number: doc.number,
            description: doc.description,
            floor: doc.floor,
            rooms: doc.rooms,
            bathrooms: doc.bathrooms,
            floorArea: doc.floorArea,
            price: doc.price,
            createdAt: new Date(doc.createdAt),

            // Create project with developer
            project: {
              id: doc.projectId,
              name: doc.projectName,
              developer: {
                name: doc.developerName,
              },
            },

            // Map amenities with icons
            amenities: doc.amenityIds
              ? doc.amenityIds.map((id, index) => ({
                  id,
                  name: doc.amenityNames ? doc.amenityNames[index] || '' : '',
                }))
              : [],

            // Map images
            images: doc.imageUrls
              ? doc.imageUrls.map((url, index) => ({
                  url,
                }))
              : [],
          };

          return searchUnit;
        });

        return {
          items,
          total,
          facets: facetCounts,
        };
      }

      return {
        items: [],
        total,
        facets: facetCounts,
      };
    } catch (error) {
      this.logger.error(
        `Error in search service: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find similar units based on vector similarity in Typesense
   *
   * @param unitId The ID of the unit to find similar units for
   * @param limit Maximum number of similar units to return
   * @returns Array of similar units
   */
  async findSimilarUnits(
    unitId: string,
    limit = 5
  ): Promise<SearchUnitDocument[]> {
    try {
      // First check if the units collection has an embedding field
      const collectionInfo = await this.typesenseService
        .getClient()
        .collections('units')
        .retrieve();

      const hasEmbeddingField = collectionInfo.fields.some(
        (field) => field.name === 'embedding'
      );

      if (!hasEmbeddingField) {
        this.logger.warn(
          'No embedding field found in Typesense collection, falling back to database similarity'
        );
        throw new Error('No embedding field in Typesense collection');
      }

      // Use Typesense vector search to find similar units
      const searchParams = {
        q: '*',
        vector_query: `embedding:([], id: ${unitId})`,
        per_page: limit,
        exclude_fields: 'embedding',
      };

      const searchResults =
        await this.typesenseService.searchUnits(searchParams);

      // Map Typesense results to our dedicated search model
      return searchResults.hits.map((hit) => {
        const doc = hit.document;

        // Map to our SearchUnitDocument model
        const searchUnit: SearchUnitDocument = {
          id: doc.id,
          name: doc.name,
          number: doc.number,
          description: doc.description,
          floor: doc.floor,
          rooms: doc.rooms,
          bathrooms: doc.bathrooms,
          floorArea: doc.floorArea,
          price: doc.price,
          createdAt: new Date(doc.createdAt),

          // Create project with developer
          project: {
            id: doc.projectId,
            name: doc.projectName,
            developer: {
              name: doc.developerName,
            },
          },

          // Map amenities with icons
          amenities: doc.amenityIds
            ? doc.amenityIds.map((id, index) => ({
                id,
                name: doc.amenityNames ? doc.amenityNames[index] || '' : '',
                icon: doc.amenityIcons ? doc.amenityIcons[index] || '' : '',
              }))
            : [],

          // Map images
          images: doc.imageUrls
            ? doc.imageUrls.map((url, index) => ({
                id: `${doc.id}-image-${index}`,
                url,
                altText: doc.name,
              }))
            : [],
        };

        return searchUnit;
      });
    } catch (error) {
      this.logger.error(
        `Typesense similarity search error: ${error.message}`,
        error.stack
      );

      // If we have a database fallback, we can use it here
      const unit = await this.unitRepository.findOne({
        where: { id: unitId },
      });

      if (!unit) {
        throw new Error(`Unit with ID ${unitId} not found`);
      }

      // Use vector similarity search with SQL function
      const similarUnits = await this.unitRepository.query(
        `
          SELECT u.* 
          FROM units u
          WHERE u.id IN (
            SELECT id FROM match_similar_units($1)
          )
          ORDER BY (
            SELECT similarity 
            FROM match_similar_units($1) m 
            WHERE m.id = u.id
          ) DESC
          LIMIT $2
        `,
        [unitId, limit]
      );

      // Map database results to our search model format
      return similarUnits.map((dbUnit) => ({
        id: dbUnit.id,
        name: dbUnit.name,
        number: dbUnit.number,
        description: dbUnit.description,
        floor: dbUnit.floor,
        rooms: dbUnit.rooms,
        bathrooms: dbUnit.bathrooms,
        floorArea: dbUnit.floor_area,
        price: dbUnit.price,
        createdAt: new Date(dbUnit.created_at),
        project: {
          id: dbUnit.project_id,
          name: 'Unknown Project', // We don't have this data from the raw query
          developer: {
            id: '',
            name: 'Unknown Developer',
          },
        },
        amenities: [],
        images: [],
      }));
    }
  }

  /**
   * Get only facet counts without unit data - more efficient for filters
   *
   * @param filter Unit filter criteria
   * @returns Facet counts for filtering
   */
  async getFacetCounts(filter?: UnitFilterInput): Promise<FacetCountResponse> {
    try {
      // Build search parameters for Typesense
      const searchParams: any = {
        q: filter?.searchTerm || '*',
        query_by:
          'name,number,description,projectName,developerName,amenityNames',
        filter_by: '',
        per_page: 0, // We don't need any actual results, just facets
        facet_by:
          'projectId,rooms,floor,price,floorArea,amenityNames,amenityIds,projectName,developerName',
        num_typos: 1,
        prefix: true,
        cache: true,
      };

      // Add filtering
      const filterConditions = [];

      if (filter?.projectIds && filter.projectIds.length > 0) {
        const projectFilter = filter.projectIds
          .map((id) => `projectId:=${id}`)
          .join(' || ');
        filterConditions.push(`(${projectFilter})`);
      }

      if (filter?.amenityIds && filter.amenityIds.length > 0) {
        const amenityFilter = filter.amenityIds
          .map((id) => `amenityIds:=${id}`)
          .join(' && ');
        filterConditions.push(`(${amenityFilter})`);
      }

      if (filter?.minRooms !== undefined) {
        filterConditions.push(`rooms:>=${filter.minRooms}`);
      }
      if (filter?.maxRooms !== undefined) {
        filterConditions.push(`rooms:<=${filter.maxRooms}`);
      }

      if (filter?.minPrice !== undefined) {
        filterConditions.push(`price:>=${filter.minPrice}`);
      }
      if (filter?.maxPrice !== undefined) {
        filterConditions.push(`price:<=${filter.maxPrice}`);
      }

      if (filter?.minFloorArea !== undefined) {
        filterConditions.push(`floorArea:>=${filter.minFloorArea}`);
      }
      if (filter?.maxFloorArea !== undefined) {
        filterConditions.push(`floorArea:<=${filter.maxFloorArea}`);
      }

      // Combine all filter conditions
      if (filterConditions.length > 0) {
        searchParams.filter_by = filterConditions.join(' && ');
      }

      const searchResults =
        await this.typesenseService.searchUnits(searchParams);

      // Extract facet counts from the search results
      return {
        facets: searchResults.facet_counts || [],
        total: searchResults.found || 0,
      };
    } catch (error) {
      this.logger.error(
        `Error getting facet counts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
