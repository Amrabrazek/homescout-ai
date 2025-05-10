import { GET_DEVELOPERS } from './queries';
import { useQuery } from '@apollo/client';
import { Developer } from './types';
import React from 'react';

export function useDevelopers(options?: {
  selectedDeveloper?: Developer | null;
  disabled?: boolean;
}) {
  const { selectedDeveloper, disabled } = options || {};

  const { data, loading } = useQuery(GET_DEVELOPERS, {
    notifyOnNetworkStatusChange: true,
    skip: disabled,
  });

  // Process developers to include the selected developer if it's not in the list
  const developers = React.useMemo(() => {
    if (!data?.developers) return selectedDeveloper ? [selectedDeveloper] : [];

    if (selectedDeveloper) {
      const developerExists = data.developers.some(
        (d: Developer) => d.id === selectedDeveloper.id
      );

      if (!developerExists) {
        return [selectedDeveloper, ...data.developers];
      }
    }

    return data.developers;
  }, [data, selectedDeveloper]);

  return {
    developers,
    loading,
    data,
  };
}
