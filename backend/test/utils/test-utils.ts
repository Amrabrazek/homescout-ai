import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UnitResolver } from '../../src/modules/unit/unit.resolver';
import { UnitService } from '../../src/modules/unit/unit.service';
import { ProjectService } from '../../src/modules/project/project.service';

// In-memory test data store
export const TestDataStore = {
  units: new Map(),
  projects: new Map(),
  developers: new Map(),
  amenities: new Map(),
  images: new Map(),

  // Initialize with a test project
  initialize() {
    this.reset(); // Make sure we start clean

    // Add test developer
    const developerId = uuidv4();
    this.developers.set(developerId, {
      id: developerId,
      name: 'Test Developer',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Add test project
    const projectId = uuidv4();
    this.projects.set(projectId, {
      id: projectId,
      name: 'E2E Test Project',
      description: 'Project for e2e testing',
      location: 'Test Location',
      developer_id: developerId,
      developerId: developerId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return projectId;
  },

  // Reset all data
  reset() {
    this.units.clear();
    this.projects.clear();
    this.developers.clear();
    this.amenities.clear();
    this.images.clear();
  },
};

/**
 * Load test environment variables
 */
export function loadTestEnv() {
  try {
    // Try to load .env.test file
    const testEnvPath = path.join(process.cwd(), '.env.test');
    if (fs.existsSync(testEnvPath)) {
      dotenv.config({ path: testEnvPath });
      return true;
    }
  } catch (e) {
    console.warn('Error loading test environment:', e.message);
  }

  // Fallback to default .env
  dotenv.config();
  return false;
}

// Mock UnitService
export const mockUnitService = {
  findAllWithCount: jest.fn(async (filter, sort, limit, offset) => {
    const units = Array.from(TestDataStore.units.values());

    // Apply filters if they exist
    let filteredUnits = [...units];
    if (filter) {
      if (filter.projectIds && filter.projectIds.length > 0) {
        filteredUnits = filteredUnits.filter((unit) =>
          filter.projectIds.includes(unit.projectId)
        );
      }
      // Add more filter logic as needed
    }

    // Apply sorting if it exists
    if (sort) {
      filteredUnits.sort((a, b) => {
        if (sort.direction === 'ASC') {
          return a[sort.field] > b[sort.field] ? 1 : -1;
        } else {
          return a[sort.field] < b[sort.field] ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const paginatedUnits = filteredUnits.slice(
      offset || 0,
      (offset || 0) + (limit || filteredUnits.length)
    );

    return [paginatedUnits, filteredUnits.length];
  }),

  findOne: jest.fn(async (id) => {
    return TestDataStore.units.get(id) || null;
  }),

  create: jest.fn(async (createUnitInput) => {
    // Validate input
    if (!createUnitInput.name || createUnitInput.name.length < 3) {
      throw new Error('Name must be at least 3 characters');
    }
    if (createUnitInput.floor < 0) {
      throw new Error('Floor must be non-negative');
    }
    if (createUnitInput.rooms <= 0) {
      throw new Error('Rooms must be positive');
    }

    // Check if project exists
    if (!TestDataStore.projects.has(createUnitInput.projectId)) {
      throw new Error('Project not found');
    }

    const id = uuidv4();
    const newUnit = {
      id,
      ...createUnitInput,
      created_at: new Date(),
      updated_at: new Date(),
    };

    TestDataStore.units.set(id, newUnit);
    return newUnit;
  }),

  update: jest.fn(async (id, updateUnitInput) => {
    // Check if unit exists
    if (!TestDataStore.units.has(id)) {
      throw new Error('Unit not found');
    }

    // Validate input
    if (updateUnitInput.rooms !== undefined && updateUnitInput.rooms <= 0) {
      throw new Error('Rooms must be positive');
    }

    const existingUnit = TestDataStore.units.get(id);
    const updatedUnit = {
      ...existingUnit,
      ...updateUnitInput,
      updated_at: new Date(),
    };

    TestDataStore.units.set(id, updatedUnit);
    return updatedUnit;
  }),

  delete: jest.fn(async (id) => {
    // Check if unit exists
    if (!TestDataStore.units.has(id)) {
      throw new Error('Unit not found');
    }

    const unit = TestDataStore.units.get(id);
    TestDataStore.units.delete(id);
    return unit;
  }),

  getUnitAmenities: jest.fn(async () => []),
  getUnitImages: jest.fn(async () => []),
};

// Mock ProjectService
export const mockProjectService = {
  findOne: jest.fn(async (id) => {
    return TestDataStore.projects.get(id) || null;
  }),
};

// GraphQL typeDefs for testing
const typeDefs = `
  enum SortDirection {
    ASC
    DESC
  }

  enum UnitSortField {
    PRICE
    FLOOR_AREA
    ROOMS
    CREATED_AT
  }

  input UnitSortInput {
    field: UnitSortField!
    direction: SortDirection!
  }

  input UnitFilterInput {
    projectIds: [String!]
    searchTerm: String
    minPrice: Float
    maxPrice: Float
    minRooms: Int
    maxRooms: Int
    minFloorArea: Float
    maxFloorArea: Float
    amenityIds: [String!]
  }

  input CreateUnitInput {
    name: String!
    number: String!
    floor: Int!
    rooms: Int!
    bathrooms: Int!
    floorArea: Float!
    description: String
    price: Float!
    projectId: String!
    amenityIds: [String!]
    imageIds: [String!]
  }

  input UpdateUnitInput {
    id: ID!
    name: String
    number: String
    floor: Int
    rooms: Int
    bathrooms: Int
    floorArea: Float
    description: String
    price: Float
    projectId: String
    amenityIds: [String!]
    imageIds: [String!]
  }
`;

/**
 * Set up a test app for e2e testing with completely mocked services
 * This approach avoids any real database connections
 */
export async function setupTestApp(): Promise<INestApplication> {
  // Load test environment
  loadTestEnv();

  try {
    // Initialize the test data store
    const testProjectId = TestDataStore.initialize();

    // Create a test module with only the necessary components
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Set up a minimal GraphQL module with auto schema
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          playground: false,
          typeDefs, // Add our typeDefs to ensure all types are defined
        }),
      ],
      providers: [
        // Add only the resolver we want to test
        UnitResolver,
        // Provide mocked services
        {
          provide: UnitService,
          useValue: mockUnitService,
        },
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
      ],
    }).compile();

    // Update .env.test with test project ID
    const envFilePath = '.env.test';
    try {
      let envContent = '';
      if (fs.existsSync(envFilePath)) {
        envContent = fs.readFileSync(envFilePath, 'utf8');
        if (envContent.includes('E2E_TEST_PROJECT_ID=')) {
          envContent = envContent.replace(
            /E2E_TEST_PROJECT_ID=.*/,
            `E2E_TEST_PROJECT_ID=${testProjectId}`
          );
        } else {
          envContent += `\nE2E_TEST_PROJECT_ID=${testProjectId}\n`;
        }
        fs.writeFileSync(envFilePath, envContent);
      }
    } catch (err) {
      console.warn('Could not update .env.test file');
    }

    const app = moduleFixture.createNestApplication();
    await app.init();

    return app;
  } catch (error) {
    console.error('Error setting up test application:', error);
    throw error;
  }
}

/**
 * Generate a unique identifier for test data
 */
export function generateUniqueIdentifier(): string {
  return `test-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
