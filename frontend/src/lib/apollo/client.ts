import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

function getGraphQLEndpoint() {
  if (typeof window === 'undefined') {
    return process.env.GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql';
  }
  return (
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql'
  );
}

// Create a properly configured cache with type policies
function createCache() {
  return new InMemoryCache({
    typePolicies: {
      UnitResponse: {
        // Configure merging strategy for UnitResponse
        fields: {
          items: {
            // Merge strategy for items field in UnitResponse
            merge(existing = [], incoming) {
              return incoming; // Replace with incoming when filters/sort changes
            },
          },
          facets: {
            // Merge strategy for facets
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
      // Add policy for our new SearchUnitsResponse type
      SearchUnitsResponse: {
        fields: {
          items: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          facets: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
      Query: {
        fields: {
          units: {
            // Use the query arguments to build a cache key
            keyArgs: ['filter', 'sort'],
            // This merge function handles pagination for infinite scroll
            merge(existing, incoming, { args }) {
              const offset = args?.offset || 0;

              // If it's a fresh query (offset is 0), just return incoming
              if (offset === 0 || !existing) {
                return incoming;
              }

              // For pagination, merge the items
              return {
                ...incoming,
                items: [...existing.items, ...incoming.items],
              };
            },
          },
          // Add similar policy for searchUnits query
          searchUnits: {
            keyArgs: ['filter', 'sort'],
            merge(existing, incoming, { args }) {
              const offset = args?.offset || 0;

              // If it's a fresh query (offset is 0), just return incoming
              if (offset === 0 || !existing) {
                return incoming;
              }

              // For pagination, merge the items
              const result = {
                ...incoming,
                items: [...existing.items, ...incoming.items],
              };

              return result;
            },
          },
        },
      },
      // TypeScript-friendly type identifiers for cache objects
      Unit: {
        keyFields: ['id'],
      },
      Project: {
        keyFields: ['id'],
      },
      Amenity: {
        keyFields: ['id'],
      },
      // Add type identifiers for our search types
      SearchUnitDocument: {
        keyFields: ['id'],
      },
      SearchProject: {
        keyFields: ['id'],
      },
      SearchAmenity: {
        keyFields: ['id'],
      },
    },
  });
}

// Server-side Apollo client
export function getServerClient() {
  return new ApolloClient({
    cache: createCache(),
    link: new HttpLink({
      uri: getGraphQLEndpoint(),
    }),
    ssrMode: true,
  });
}

// Client-side Apollo client
export function getClient() {
  return new ApolloClient({
    uri: getGraphQLEndpoint(),
    cache: createCache(),
  });
}
