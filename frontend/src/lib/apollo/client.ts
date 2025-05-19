import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Logic to determine correct backend URL based on environment
function getGraphQLEndpoint() {
  // Check if we're running in a Docker container
  const inDocker = process.env.IN_DOCKER === 'true';

  // For server-side in Docker, use the backend service name
  const serverSideUrl = inDocker
    ? 'http://backend:3001/graphql'
    : process.env.GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql';

  // For client-side, use the public URL that's accessible from browser
  const clientSideUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql';

  // Use different endpoints for server and client side rendering
  return typeof window === 'undefined' ? serverSideUrl : clientSideUrl;
}

// Server-side Apollo client
export function getServerClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
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
    cache: new InMemoryCache(),
  });
}
