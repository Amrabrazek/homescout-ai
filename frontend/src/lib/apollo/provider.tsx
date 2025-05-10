'use client';

import { ApolloProvider } from '@apollo/client';
import { useMemo } from 'react';
import { getClient } from './client';

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  const client = useMemo(() => getClient(), []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
