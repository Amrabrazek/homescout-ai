# Search Module

This module provides a dedicated GraphQL API for Typesense-only searches, completely bypassing the database and GraphQL resolvers.

## Motivation

The initial implementation used GraphQL resolvers to populate relations for units fetched from Typesense. This approach caused several issues:

1. **Resolver Chain Issues** - Even when data was fetched from Typesense with all necessary relations, the GraphQL resolvers would still be triggered, potentially overwriting correct data from Typesense with database data.

2. **Database Dependencies** - The original approach still required database queries even when the full data was available from Typesense.

3. **Performance Issues** - Additional database queries decreased performance, negating some of the benefits of using Typesense for search.

## Architecture

This module implements a clean separation of concerns:

- `SearchService` - Directly queries Typesense and maps results to the expected GraphQL schema format
- `SearchResolver` - Exposes a dedicated GraphQL query (`searchUnits`) that uses the SearchService

## Benefits

1. **Complete Independence** - The search module works completely independently from the database.

2. **Simplified Data Flow** - Data flows directly from Typesense to the client without any intermediate database queries.

3. **Improved Performance** - Eliminating unnecessary database queries improves overall performance.

4. **Better Type Safety** - Direct mapping of Typesense results to expected GraphQL types improves type safety.

5. **Toggleable Implementation** - The frontend can easily switch between the database and Typesense backends.

## Usage

Frontend clients should use the `SEARCH_UNITS` query when Typesense is enabled:

```typescript
// In hooks.ts
export function useUnits(filter: UnitFilter, sort?: UnitSort, offset = 0) {
  if (USE_TYPESENSE) {
    return useQuery<SearchUnitsQueryResponse, GetUnitsQueryVariables>(
      SEARCH_UNITS,
      {
        variables: {
          filter,
          sort,
          limit: UNITS_PER_PAGE,
          offset,
        },
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
      }
    );
  }

  // Fall back to database query
  return useQuery<GetUnitsQueryResponse, GetUnitsQueryVariables>(GET_UNITS, ...);
}
```
