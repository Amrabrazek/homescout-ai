import { GET_PROJECTS } from './queries';
import { useQuery } from '@apollo/client';
import { Project } from './types';
import { useEffect, useState, useMemo } from 'react';

export function useProjects({
  searchTerm = '',
  limit = 10,
  initialOffset = 0,
  developerId,
  selectedProject,
  disabled = false,
}: {
  searchTerm?: string;
  limit?: number;
  initialOffset?: number;
  developerId?: string | null;
  selectedProject?: Project | null;
  disabled?: boolean;
}) {
  const [offset, setOffset] = useState(initialOffset);
  const [projects, setProjects] = useState<Project[]>(
    selectedProject ? [selectedProject] : []
  );
  const [hasMore, setHasMore] = useState(true);
  const [initialProject, setInitialProject] = useState<Project | null>(
    selectedProject || null
  );

  const { data, loading, fetchMore, refetch } = useQuery(GET_PROJECTS, {
    variables: {
      limit,
      offset: initialOffset,
      searchTerm,
      developerId: developerId || undefined,
    },
    notifyOnNetworkStatusChange: true,
    skip: disabled,
  });

  // Update projects when data changes
  useEffect(() => {
    if (data?.projects) {
      // Keep the initial project in the list if it exists
      if (initialProject) {
        const hasInitialProject = data.projects.some(
          (p: Project) => p.id === initialProject.id
        );
        if (!hasInitialProject) {
          setProjects([initialProject, ...data.projects]);
        } else {
          setProjects(data.projects);
        }
      } else {
        setProjects(data.projects);
      }
      setHasMore(data.projects.length === limit);
    }
  }, [data, initialProject, limit]);

  // Add the selected project to the projects list if it exists and isn't already there
  useEffect(() => {
    if (selectedProject) {
      setInitialProject(selectedProject);
      setProjects((prev) => {
        if (!prev.some((p) => p.id === selectedProject.id)) {
          return [selectedProject, ...prev];
        }
        return prev;
      });
    }
  }, [selectedProject]);

  const loadMore = () => {
    if (!hasMore || loading) return;

    const nextOffset = offset + limit;
    setOffset(nextOffset);

    fetchMore({
      variables: {
        offset: nextOffset,
        limit,
        searchTerm,
        developerId: developerId || undefined,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult?.projects) return prev;

        const newProjects = fetchMoreResult.projects;

        // Only set hasMore to false if we received fewer items than requested
        // This ensures we keep trying until we receive a smaller batch
        setHasMore(newProjects.length === limit);

        // If we got an empty array, we're definitely at the end
        if (newProjects.length === 0) {
          setHasMore(false);
        }

        // Create a map of existing projects to avoid duplicates
        const existingProjectsMap = new Map(
          prev.projects.map((p: Project) => [p.id, p])
        );

        // Add new projects, avoiding duplicates
        newProjects.forEach((project: Project) => {
          if (!existingProjectsMap.has(project.id)) {
            existingProjectsMap.set(project.id, project);
          }
        });

        // Convert map back to array
        const combinedProjects = Array.from(existingProjectsMap.values());

        return {
          projects: combinedProjects,
        };
      },
    });
  };

  const resetSearch = (
    newSearchTerm: string,
    newDeveloperId?: string | null
  ) => {
    setOffset(0);
    if (newSearchTerm) {
      setProjects([]);
      setHasMore(false);
    }
    refetch({
      limit,
      offset: 0,
      searchTerm: newSearchTerm,
      developerId: newDeveloperId || undefined,
    });
  };

  return {
    projects,
    loading,
    hasMore,
    loadMore,
    refetch,
    resetSearch,
    initialProject,
    setInitialProject,
  };
}
