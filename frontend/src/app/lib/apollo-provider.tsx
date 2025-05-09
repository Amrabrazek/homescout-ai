'use client';

import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { useMemo } from 'react';

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  const client = useMemo(() => {
    return new ApolloClient({
      uri: process.env.GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
      cache: new InMemoryCache(),
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
