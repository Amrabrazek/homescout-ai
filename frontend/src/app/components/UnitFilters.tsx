'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '../hooks/useDebounce';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';

const GET_FILTER_DATA = gql`
  query GetFilterData {
    amenities {
      id
      name
      icon
    }
  }
`;

const GET_PROJECTS = gql`
  query GetProjects($searchTerm: String, $limit: Int, $offset: Int) {
    projects(searchTerm: $searchTerm, limit: $limit, offset: $offset) {
      id
      name
    }
  }
`;

type FilterProps = {
  filters: {
    searchTerm?: string;
    projectIds?: string[];
    amenityIds?: string[];
    minRooms?: number;
    maxRooms?: number;
    minPrice?: number;
    maxPrice?: number;
    minFloorArea?: number;
    maxFloorArea?: number;
  };
  onChange: (filters: any) => void;
  totalUnits?: number;
  displayedUnits?: number;
};

export default function UnitFilters({
  filters,
  onChange,
  totalUnits = 0,
  displayedUnits = 0,
}: FilterProps) {
  const { data, loading } = useQuery(GET_FILTER_DATA);
  const [localFilters, setLocalFilters] = useState(filters);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [projectOffset, setProjectOffset] = useState(0);
  const [hasMoreProjects, setHasMoreProjects] = useState(true);

  const projectsPerPage = 10;

  // Debounce the numeric and text inputs to prevent excessive API calls
  const debouncedFilters = useDebounce(localFilters, 500);
  const debouncedProjectSearch = useDebounce(projectSearchTerm, 300);

  // Query for projects with pagination and search
  const {
    data: projectsData,
    loading: projectsLoading,
    fetchMore,
  } = useQuery(GET_PROJECTS, {
    variables: {
      searchTerm: debouncedProjectSearch,
      limit: projectsPerPage,
      offset: 0,
    },
    onCompleted: (data) => {
      const projects = data.projects || [];
      setProjectOptions(
        projects.map((project: any) => ({
          id: project.id,
          label: project.name,
        }))
      );
      setHasMoreProjects(projects.length === projectsPerPage);
      setProjectOffset(projectsPerPage);
    },
  });

  // Update parent component with debounced filters
  useEffect(() => {
    onChange(debouncedFilters);
  }, [debouncedFilters, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setLocalFilters({
        ...localFilters,
        [name]: value ? Number(value) : undefined,
      });
    } else {
      setLocalFilters({
        ...localFilters,
        [name]: value,
      });
    }
  };

  const handleProjectsChange = (selectedIds: string[]) => {
    // Project changes don't need debounce
    setLocalFilters({ ...localFilters, projectIds: selectedIds });
    onChange({ ...filters, projectIds: selectedIds });
  };

  const handleProjectSearch = (searchTerm: string) => {
    setProjectSearchTerm(searchTerm);
    setProjectOffset(0);
    setHasMoreProjects(true);
  };

  const handleLoadMoreProjects = () => {
    fetchMore({
      variables: {
        searchTerm: debouncedProjectSearch,
        limit: projectsPerPage,
        offset: projectOffset,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        const newProjects = fetchMoreResult.projects;
        setHasMoreProjects(newProjects.length === projectsPerPage);
        setProjectOffset(projectOffset + projectsPerPage);

        // Update project options
        setProjectOptions([
          ...projectOptions,
          ...newProjects.map((project: any) => ({
            id: project.id,
            label: project.name,
          })),
        ]);

        return {
          ...prev,
          projects: [...prev.projects, ...newProjects],
        };
      },
    });
  };

  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    const currentAmenities = localFilters.amenityIds || [];
    const newAmenities = checked
      ? [...currentAmenities, amenityId]
      : currentAmenities.filter((id) => id !== amenityId);

    // Checkbox changes don't need debounce
    setLocalFilters({ ...localFilters, amenityIds: newAmenities });
    onChange({ ...filters, amenityIds: newAmenities });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex justify-between items-center'>
          <span>Filters</span>
          {totalUnits > 0 && (
            <Badge variant='outline' className='ml-2'>
              {totalUnits}{' '}
              {totalUnits === 1 ? 'unit available' : 'units available'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='searchTerm'>Search by name or number</Label>
          <div className='relative'>
            <Input
              id='searchTerm'
              name='searchTerm'
              placeholder='Search units...'
              value={localFilters.searchTerm || ''}
              onChange={handleInputChange}
            />
            {localFilters.searchTerm !== debouncedFilters.searchTerm && (
              <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
              </div>
            )}
          </div>
        </div>

        <MultiSelect
          label='Projects'
          options={projectOptions}
          selectedIds={localFilters.projectIds || []}
          onChange={handleProjectsChange}
          placeholder='Select projects'
          maxHeight={200}
          searchable={true}
          onSearch={handleProjectSearch}
          onLoadMore={handleLoadMoreProjects}
          isLoading={projectsLoading}
          hasMore={hasMoreProjects}
        />

        <div className='space-y-2'>
          <Label>Price Range</Label>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Input
                type='number'
                name='minPrice'
                placeholder='Min'
                value={localFilters.minPrice || ''}
                onChange={handleInputChange}
              />
              {localFilters.minPrice !== debouncedFilters.minPrice && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  <div className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
                </div>
              )}
            </div>
            <div className='relative flex-1'>
              <Input
                type='number'
                name='maxPrice'
                placeholder='Max'
                value={localFilters.maxPrice || ''}
                onChange={handleInputChange}
              />
              {localFilters.maxPrice !== debouncedFilters.maxPrice && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  <div className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Rooms</Label>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Input
                type='number'
                name='minRooms'
                placeholder='Min'
                value={localFilters.minRooms || ''}
                onChange={handleInputChange}
              />
              {localFilters.minRooms !== debouncedFilters.minRooms && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  <div className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
                </div>
              )}
            </div>
            <div className='relative flex-1'>
              <Input
                type='number'
                name='maxRooms'
                placeholder='Max'
                value={localFilters.maxRooms || ''}
                onChange={handleInputChange}
              />
              {localFilters.maxRooms !== debouncedFilters.maxRooms && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  <div className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Area (sqm)</Label>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Input
                type='number'
                name='minFloorArea'
                placeholder='Min'
                value={localFilters.minFloorArea || ''}
                onChange={handleInputChange}
              />
              {localFilters.minFloorArea !== debouncedFilters.minFloorArea && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  <div className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
                </div>
              )}
            </div>
            <div className='relative flex-1'>
              <Input
                type='number'
                name='maxFloorArea'
                placeholder='Max'
                value={localFilters.maxFloorArea || ''}
                onChange={handleInputChange}
              />
              {localFilters.maxFloorArea !== debouncedFilters.maxFloorArea && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  <div className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary'></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Amenities</Label>
          <div className='grid grid-cols-1 gap-2'>
            {data?.amenities?.map((amenity: any) => (
              <div key={amenity.id} className='flex items-center space-x-2'>
                <Checkbox
                  id={`amenity-${amenity.id}`}
                  checked={(localFilters.amenityIds || []).includes(amenity.id)}
                  onCheckedChange={(checked) =>
                    handleAmenityChange(amenity.id, checked as boolean)
                  }
                />
                <Label htmlFor={`amenity-${amenity.id}`}>{amenity.name}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
