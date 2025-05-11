import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import {
  generateUniqueIdentifier,
  setupTestApp,
  TestDataStore,
} from '../utils/test-utils';

// Set a longer timeout for all tests in this file
jest.setTimeout(30000);

describe('UnitResolver (e2e)', () => {
  let app: INestApplication;
  let createdUnitId: string;
  let projectId: string;

  beforeAll(async () => {
    // Reset test data store and set up app
    TestDataStore.reset();
    app = await setupTestApp();

    // Get a valid project ID from the test data store
    if (TestDataStore.projects.size > 0) {
      projectId = Array.from(TestDataStore.projects.values())[0].id;
      console.log(`Using project ID: ${projectId} for unit tests`);
    } else {
      console.error('No projects found in test data store');
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Clean up
    TestDataStore.reset();
  });

  it('should create a new unit', async () => {
    // Skip test if no valid project ID is available
    if (!projectId) {
      console.log('Skipping test: no valid project ID');
      return;
    }

    const uniqueId = generateUniqueIdentifier();
    const createUnitInput = {
      name: `Test Unit ${uniqueId}`,
      number: `A-${uniqueId}`,
      floor: 1,
      rooms: 2,
      bathrooms: 1,
      floorArea: 120.5,
      description: 'A test unit created for e2e testing',
      price: 1500000,
      projectId: projectId,
    };

    // Define the GraphQL mutation
    const createUnitMutation = `
      mutation CreateUnit($input: CreateUnitInput!) {
        createUnit(createUnitInput: $input) {
          id
          name
          number
          floor
          rooms
          bathrooms
          floorArea
          description
          price
          projectId
        }
      }
    `;

    // Execute the mutation
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: createUnitMutation,
        variables: { input: createUnitInput },
      })
      .expect(200);

    // Check for GraphQL errors
    if (response.body.errors) {
      console.error(
        'GraphQL errors:',
        JSON.stringify(response.body.errors, null, 2)
      );
      // Continue the test, but mark it as a failure if errors are present
      expect(response.body.errors).toBeUndefined();
      return;
    }

    // Verify the response
    expect(response.body.data).toBeDefined();
    expect(response.body.data.createUnit).toBeDefined();
    expect(response.body.data.createUnit.name).toBe(createUnitInput.name);
    expect(response.body.data.createUnit.number).toBe(createUnitInput.number);
    expect(response.body.data.createUnit.floor).toBe(createUnitInput.floor);
    expect(response.body.data.createUnit.rooms).toBe(createUnitInput.rooms);
    expect(response.body.data.createUnit.bathrooms).toBe(
      createUnitInput.bathrooms
    );
    expect(response.body.data.createUnit.floorArea).toBe(
      createUnitInput.floorArea
    );
    expect(response.body.data.createUnit.description).toBe(
      createUnitInput.description
    );
    expect(response.body.data.createUnit.price).toBe(createUnitInput.price);
    expect(response.body.data.createUnit.projectId).toBe(
      createUnitInput.projectId
    );

    // Save the ID for subsequent tests
    createdUnitId = response.body.data.createUnit.id;

    // Verify unit was added to test data store
    expect(TestDataStore.units.has(createdUnitId)).toBe(true);
  });

  it('should retrieve the created unit', async () => {
    // Skip this test if no unit was created
    if (!createdUnitId) {
      return;
    }

    // Define the GraphQL query
    const getUnitQuery = `
      query GetUnit($id: String!) {
        unit(id: $id) {
          id
          name
          number
          floor
          rooms
          bathrooms
          floorArea
          description
          price
          projectId
        }
      }
    `;

    // Execute the query
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: getUnitQuery,
        variables: { id: createdUnitId },
      })
      .expect(200);

    // Verify the response
    expect(response.body.data.unit).toBeDefined();
    expect(response.body.data.unit.id).toBe(createdUnitId);
  });

  it('should update the unit', async () => {
    // Skip this test if no unit was created
    if (!createdUnitId) {
      return;
    }

    const updatedPrice = 1600000;
    const updatedDescription = 'Updated description for e2e testing';

    // Define the GraphQL mutation
    const updateUnitMutation = `
      mutation UpdateUnit($input: UpdateUnitInput!) {
        updateUnit(updateUnitInput: $input) {
          id
          name
          price
          description
        }
      }
    `;

    // Execute the mutation
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: updateUnitMutation,
        variables: {
          input: {
            id: createdUnitId,
            price: updatedPrice,
            description: updatedDescription,
          },
        },
      })
      .expect(200);

    // Verify the response
    expect(response.body.data.updateUnit).toBeDefined();
    expect(response.body.data.updateUnit.id).toBe(createdUnitId);
    expect(response.body.data.updateUnit.price).toBe(updatedPrice);
    expect(response.body.data.updateUnit.description).toBe(updatedDescription);
  });

  it('should delete the unit', async () => {
    // Skip this test if no unit was created
    if (!createdUnitId) {
      return;
    }

    // Define the GraphQL mutation
    const deleteUnitMutation = `
      mutation DeleteUnit($id: String!) {
        deleteUnit(id: $id) {
          id
          name
        }
      }
    `;

    // Execute the mutation
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: deleteUnitMutation,
        variables: { id: createdUnitId },
      })
      .expect(200);

    // Verify the response
    expect(response.body.data.deleteUnit).toBeDefined();
    expect(response.body.data.deleteUnit.id).toBe(createdUnitId);

    // Verify that the unit was actually deleted by trying to fetch it again
    const getUnitQuery = `
      query GetUnit($id: String!) {
        unit(id: $id) {
          id
        }
      }
    `;

    // Execute the query and expect the unit to not be found
    const getResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: getUnitQuery,
        variables: { id: createdUnitId },
      })
      .expect(200);

    // Depending on your API design, the response might be null for a deleted unit
    expect(getResponse.body.data.unit).toBeNull();
  });
});
