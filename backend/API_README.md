# Nawy GraphQL API Documentation

Welcome to the documentation for the Nawy GraphQL API. This set of documentation guides will help you understand and effectively use our API.

## Documentation Files

This documentation is split into multiple files for easier navigation:

1. **API_DOCUMENTATION.md** - Comprehensive guide with detailed explanations of all endpoints, types, and examples
2. **API_QUICK_REFERENCE.md** - Condensed reference sheet for quick lookups of common operations
3. **GRAPHQL_PLAYGROUND_EXAMPLES.md** - Ready-to-use examples that can be copied directly into GraphQL Playground

## Getting Started

1. Make sure the backend server is running:

   ```bash
   npm run start:dev
   ```

2. Access the GraphQL Playground at:

   ```
   http://localhost:3001/graphql
   ```

3. Start with the examples in **GRAPHQL_PLAYGROUND_EXAMPLES.md** to see how the API works

## API Overview

This API provides endpoints for managing real estate data including:

- Units (apartments, houses)
- Projects (real estate developments)
- Developers (companies)
- Amenities (features available in units)
- Images (property photos)

## Core Concepts

### Data Model Relationships

```
Developer 1:N Project 1:N Unit N:M Amenity
                              |
                              N:M
                              |
                             Image
```

### Authentication

Currently, the API does not require authentication.

### Pagination

List queries support pagination through:

- `limit`: Maximum number of items to return
- `offset`: Number of items to skip

### Filtering

The `units` query supports extensive filtering options including:

- Price range
- Room count
- Floor area
- Amenities
- Project/Developer
- Search terms

### GraphQL Benefits

- Request only the data you need
- Get related data in a single request
- Strong typing with schema validation
- Interactive documentation in GraphQL Playground

## Common Workflows

1. **Browse Units**: Query units with filtering, sorting and pagination
2. **Unit Details**: Get full unit details including related project, developer, and amenities
3. **Add a Unit**: Create a unit with related amenities and images
4. **Update a Unit**: Update a unit
5. **Browse Projects**: Find projects by developer or search term

## Need Help?

If you need additional assistance, refer to the detailed documentation files or reach out to the development team.
