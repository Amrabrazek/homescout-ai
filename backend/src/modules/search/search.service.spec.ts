import { DataSource } from 'typeorm';
import { TypesenseService } from '../../common/typesense/typesense.service';
import { EmbeddingProvider } from '../embedding/embedding.provider';
import { LlmQueryParser } from './llm-query-parser';
import { SearchLlm } from './search-llm';
import { SearchService } from './search.service';

const empty = {
  minRooms: null,
  maxRooms: null,
  minPrice: null,
  maxPrice: null,
  minFloorArea: null,
  maxFloorArea: null,
  minFloor: null,
  maxFloor: null,
  propertyTypes: [],
  places: [],
  excludeAmenities: [],
  text: '',
};

function service(llmOutput: unknown) {
  const dataSource = {
    query: jest.fn(async (sql: string) =>
      sql.includes('amenities')
        ? [{ name: 'Swimming Pool' }]
        : [{ areas: ['New Cairo', 'Sheikh Zayed'], cities: [], regions: [] }]
    ),
  } as unknown as DataSource;
  const llm: SearchLlm = {
    model: 'test/model',
    extract: jest.fn(async () => llmOutput),
  };
  return new SearchService(
    {} as TypesenseService,
    dataSource,
    {} as EmbeddingProvider,
    new LlmQueryParser(llm, 10)
  );
}

describe('SearchService.understand', () => {
  it('names the groups the LLM guessed and drops the ones the buyer removed', async () => {
    const search = service({ ...empty, places: ['Sheikh Zayed'] });

    await expect(
      search.understand({ searchTerm: 'villa in tagamo3' })
    ).resolves.toEqual({
      text: '',
      filter: { propertyTypes: ['villa'], areas: ['Sheikh Zayed'] },
      guessed: ['place'],
    });
    await expect(
      search.understand({
        searchTerm: 'villa in tagamo3',
        ignoreParsed: ['place'],
      })
    ).resolves.toEqual({
      text: '',
      filter: { propertyTypes: ['villa'] },
      guessed: [],
    });
  });
});
