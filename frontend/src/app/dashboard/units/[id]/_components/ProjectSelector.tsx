'use client';

import { useEffect, useState } from 'react';
import { useProjects } from '@/lib/graphql/projects/hooks';
import { useDevelopers } from '@/lib/graphql/developers/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Project } from '@/lib/graphql/projects/types';
import { Developer } from '@/lib/graphql/developers/types';
import { useDebounce } from '@/hooks/use-debounce';

interface ProjectSelectorProps {
  name: string;
  label: string;
  selectedProject?: Project;
  disabled?: boolean;
  onChange?: (projectId: string) => void;
}

export function ProjectSelector({
  name,
  label,
  selectedProject,
  disabled = false,
  onChange,
}: ProjectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchTerm = useDebounce(searchInput, 400);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | null>(
    selectedProject?.developer?.id || null
  );
  const LIMIT = 10;

  // Extract project ID from selectedProject
  const defaultProjectId = selectedProject?.id || '';

  // Use the developers hook
  const { developers, loading: developersLoading } = useDevelopers({
    selectedDeveloper: selectedProject?.developer as Developer | null,
    disabled,
  });

  console.log("searchTerm", searchTerm);

  // Use the projects hook
  const {
    projects,
    loading,
    hasMore,
    loadMore,
    resetSearch,
    initialProject,
    setInitialProject,
  } = useProjects({
    searchTerm,
    limit: LIMIT,
    developerId: selectedDeveloperId,
    selectedProject,
    disabled,
  });

  // Effect for handling debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setSearchTerm(debouncedSearchTerm);
      resetSearch(debouncedSearchTerm, selectedDeveloperId);
    }
  }, [debouncedSearchTerm, resetSearch, selectedDeveloperId, searchTerm]);

  // Handle developer selection
  const handleDeveloperSelect = (developerId: string) => {
    setSelectedDeveloperId(developerId);
    resetSearch(searchTerm, developerId);
  };

  // Handle project selection
  const handleSelect = (projectId: string) => {
    // Remove default selected project if a new one is selected
    if (initialProject && initialProject.id !== projectId) {
      setInitialProject(null);
    }

    // Find the selected project
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      // Call the field.onChange and the onChange callback with the selected project ID
      onChange?.(project.id);
      return project.id;
    }
    return projectId;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMore();
    }
  };

  // Function to get the select value placeholder
  const getSelectPlaceholder = () => {
    if (initialProject) {
      return `${initialProject.name}${
        initialProject.developer ? ` - ${initialProject.developer.name}` : ''
      }`;
    }
    return 'Select a project';
  };

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className='space-y-3'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* Developer filter */}
                <div className='space-y-1'>
                  <Label htmlFor='developer-filter'>Filter by Developer</Label>
                  {developersLoading && developers.length === 0 ? (
                    <div className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center opacity-70'>
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                      <span className='text-muted-foreground'>
                        Loading developers...
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={selectedDeveloperId || ''}
                      onValueChange={handleDeveloperSelect}
                      disabled={disabled || developersLoading}
                    >
                      <SelectTrigger
                        id='developer-filter'
                        className={
                          developersLoading || disabled ? 'opacity-70' : ''
                        }
                      >
                        {developersLoading ? (
                          <div className='flex items-center'>
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                            <span>Loading...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder='All Developers' />
                        )}
                      </SelectTrigger>
                      <SelectContent className='max-h-[300px]'>
                        <SelectItem value=''>All Developers</SelectItem>
                        {developers.map((developer: Developer) => (
                          <SelectItem key={developer.id} value={developer.id}>
                            {developer.name}
                          </SelectItem>
                        ))}
                        {developersLoading && (
                          <div className='flex justify-center py-2'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Project search */}
                <div className='space-y-1'>
                  <Label htmlFor='project-search'>Search Projects</Label>
                  <div className='relative'>
                    <Input
                      id='project-search'
                      placeholder={
                        loading ? 'Searching...' : 'Search projects...'
                      }
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className='pl-9'
                      disabled={disabled}
                    />
                    {loading ? (
                      <Loader2 className='absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground' />
                    ) : (
                      <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none' />
                    )}
                  </div>
                </div>
              </div>

              {/* Project selection */}
              <Select
                value={field.value || defaultProjectId}
                defaultValue={defaultProjectId}
                onValueChange={(value) => {
                  const selectedId = handleSelect(value);
                  field.onChange(selectedId);
                }}
                disabled={loading || disabled}
              >
                <SelectTrigger
                  className={loading || disabled ? 'opacity-70' : ''}
                >
                  <SelectValue placeholder={getSelectPlaceholder()} />
                </SelectTrigger>
                <SelectContent
                  onScroll={handleScroll}
                  className='max-h-[300px]'
                >
                  {loading && projects.length === 0 && (
                    <div className='flex flex-col items-center justify-center py-6'>
                      <Loader2 className='h-8 w-8 animate-spin mb-2 text-primary' />
                      <p className='text-sm text-muted-foreground'>
                        Loading projects...
                      </p>
                    </div>
                  )}

                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}{' '}
                      {project.developer ? `- ${project.developer.name}` : ''}
                    </SelectItem>
                  ))}

                  {loading && projects.length > 0 && (
                    <div className='flex justify-center py-2'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                    </div>
                  )}

                  {!loading && !hasMore && projects.length > 0 && (
                    <div className='text-center text-sm text-gray-500 py-2'>
                      No more projects
                    </div>
                  )}

                  {!loading && projects.length === 0 && (
                    <div className='text-center text-sm text-gray-500 py-4'>
                      No projects found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
