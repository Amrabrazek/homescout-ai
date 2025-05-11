# End-to-End Testing for Unit Operations

This directory contains end-to-end tests for the backend GraphQL API, specifically for unit operations (create, read, update, delete). These tests use an in-memory test data store to isolate the resolver testing from the database, making tests faster and more reliable.

## Approach

Instead of connecting to a real database, these tests:

1. Use in-memory JavaScript Maps to store test data
2. Mock the service layer to interact with this in-memory store
3. Test GraphQL resolvers and their interaction with the mocked services
4. Validate the complete request/response flow through the API

This approach allows you to run tests without a database connection and with consistent, predictable test data.

## Setup

The setup script initializes the in-memory test data store with test data, such as a test project and developer:

```bash
npm run test:e2e:setup
```

This will create a `.env.test` file with the test project ID that will be used in the tests.

## Running the Tests

### Running All E2E Tests

To run all e2e tests including setup:

```bash
npm run test:e2e:full
```

### Running E2E Tests Without Setup

If you've already set up the test environment and just want to run the tests:

```bash
npm run test:e2e
```

### Running Specific Test Files

To run a specific test file:

```bash
npx jest --config ./test/jest-e2e.json ./test/unit/unit-operations.e2e-spec.ts
```

## Test Structure

The e2e tests follow this structure:

1. **Setup**: Create a test module with mocked services and in-memory data store
2. **Create**: Test creating a unit with valid and invalid data
3. **Read**: Test retrieving units and filtering them
4. **Update**: Test updating unit data
5. **Delete**: Test deleting a unit
6. **Cleanup**: Ensure the in-memory test data store is reset

## How It Works

1. `TestDataStore`: An in-memory store using JavaScript Maps to hold test data
2. Mocked Services: The service layer is mocked to use the in-memory store
3. GraphQL Tests: Tests run against the GraphQL API to validate the full stack
4. Validation: Data created during tests is verified in both the API response and the in-memory store

## Adding New Tests

When adding new e2e tests:

1. Create a new file with the `.e2e-spec.ts` extension
2. Use the `setupTestApp()` utility function to create a test application with mocked services
3. Structure your tests with descriptive `describe` and `it` blocks
4. Use the `TestDataStore` to verify that data was properly created/updated/deleted

## Benefits of This Approach

- **Database Independence**: Tests run without a database connection
- **Fast Execution**: In-memory operations are much faster than real database queries
- **Consistent Data**: Tests always run with the same initial data state
- **Isolated Testing**: Each test run starts with a clean data store

## Troubleshooting

If tests are failing, check:

1. **Test Data Store**: Ensure that the TestDataStore is properly initialized
2. **Resolver Mocks**: Check that service mocks are properly set up in test-utils.ts
3. **GraphQL Schema**: If you've made changes to the schema, ensure the test queries match
4. **Test Errors**: Look for detailed error messages in the console output
5. **Data Validation**: Verify that test data is being correctly stored and retrieved from the in-memory store
