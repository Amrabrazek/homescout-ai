'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
};

export default function UnitFilters({ filters, onChange }: FilterProps) {
  const { data, loading } = useQuery(GET_FILTER_DATA);

  // Local input state - only for controlled inputs
  const [inputValues, setInputValues] = useState({
    searchTerm: filters.searchTerm || '',
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    minRooms: filters.minRooms || '',
    maxRooms: filters.maxRooms || '',
    minFloorArea: filters.minFloorArea || '',
    maxFloorArea: filters.maxFloorArea || '',
  });

  // Single debounce timer for all text/number inputs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // For project search and pagination
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [projectOffset, setProjectOffset] = useState(0);
  const [hasMoreProjects, setHasMoreProjects] = useState(true);
  const [projectSearchTimer, setProjectSearchTimer] =
    useState<NodeJS.Timeout | null>(null);

  const projectsPerPage = 10;

  // Update local state when props change
  useEffect(() => {
    setInputValues({
      searchTerm: filters.searchTerm || '',
      minPrice: filters.minPrice || '',
      maxPrice: filters.maxPrice || '',
      minRooms: filters.minRooms || '',
      maxRooms: filters.maxRooms || '',
      minFloorArea: filters.minFloorArea || '',
      maxFloorArea: filters.maxFloorArea || '',
    });
  }, [filters]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (projectSearchTimer) clearTimeout(projectSearchTimer);
    };
  }, [projectSearchTimer]);

  // Query for projects with pagination and search
  const {
    data: projectsData,
    loading: projectsLoading,
    fetchMore,
  } = useQuery(GET_PROJECTS, {
    variables: {
      searchTerm: projectSearchTerm,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    // Update local state immediately for responsive UI
    setInputValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to update the parent after typing stops
    debounceTimerRef.current = setTimeout(() => {
      const processedValue =
        type === 'number' ? (value ? Number(value) : undefined) : value;

      onChange({
        ...filters,
        [name]: processedValue,
      });
    }, 500);
  };

  // Direct updates for multi-select/checkbox values (no debounce)
  const handleProjectsChange = (selectedIds: string[]) => {
    onChange({
      ...filters,
      projectIds: selectedIds,
    });
  };

  const handleProjectSearch = (searchTerm: string) => {
    // Debounce project search
    if (projectSearchTimer) clearTimeout(projectSearchTimer);

    const timer = setTimeout(() => {
      setProjectSearchTerm(searchTerm);
      setProjectOffset(0);
      setHasMoreProjects(true);
    }, 300);

    setProjectSearchTimer(timer);
  };

  const handleLoadMoreProjects = () => {
    fetchMore({
      variables: {
        searchTerm: projectSearchTerm,
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
    const currentAmenities = filters.amenityIds || [];
    const newAmenities = checked
      ? [...currentAmenities, amenityId]
      : currentAmenities.filter((id) => id !== amenityId);

    onChange({
      ...filters,
      amenityIds: newAmenities,
    });
  };

  const handleReset = () => {
    // Clear the debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Reset local input state
    setInputValues({
      searchTerm: '',
      minPrice: '',
      maxPrice: '',
      minRooms: '',
      maxRooms: '',
      minFloorArea: '',
      maxFloorArea: '',
    });

    // Reset filters
    onChange({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex justify-between items-center'>
          <span>Filters</span>
          <Button
            variant='outline'
            size='sm'
            onClick={handleReset}
            className='flex items-center gap-1'
          >
            <X size={14} />
            Reset All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='searchTerm'>Search by name or number</Label>
          <Input
            id='searchTerm'
            name='searchTerm'
            placeholder='Search units...'
            value={inputValues.searchTerm}
            onChange={handleInputChange}
          />
        </div>

        <MultiSelect
          label='Projects'
          options={projectOptions}
          selectedIds={filters.projectIds || []}
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
            <Input
              type='number'
              name='minPrice'
              placeholder='Min'
              value={inputValues.minPrice}
              onChange={handleInputChange}
              className='flex-1'
              min={0}
            />
            <Input
              type='number'
              name='maxPrice'
              placeholder='Max'
              value={inputValues.maxPrice}
              onChange={handleInputChange}
              className='flex-1'
              min={0}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Rooms</Label>
          <div className='flex gap-2'>
            <Input
              type='number'
              name='minRooms'
              placeholder='Min'
              value={inputValues.minRooms}
              onChange={handleInputChange}
              className='flex-1'
              min={0}
            />
            <Input
              type='number'
              name='maxRooms'
              placeholder='Max'
              value={inputValues.maxRooms}
              onChange={handleInputChange}
              className='flex-1'
              min={0}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Area (sqm)</Label>
          <div className='flex gap-2'>
            <Input
              type='number'
              name='minFloorArea'
              placeholder='Min'
              value={inputValues.minFloorArea}
              onChange={handleInputChange}
              className='flex-1'
              min={0}
            />
            <Input
              type='number'
              name='maxFloorArea'
              placeholder='Max'
              value={inputValues.maxFloorArea}
              onChange={handleInputChange}
              className='flex-1'
              min={0}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Amenities</Label>
          <div className='grid grid-cols-1 gap-2'>
            {data?.amenities?.map((amenity: any) => (
              <div key={amenity.id} className='flex items-center space-x-2'>
                <Checkbox
                  id={`amenity-${amenity.id}`}
                  checked={(filters.amenityIds || []).includes(amenity.id)}
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
