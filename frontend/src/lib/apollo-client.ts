import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// This is a server component compatible Apollo client
export function getClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
    }),
    // SSR mode for server component usage
    ssrMode: true,
  });
}
