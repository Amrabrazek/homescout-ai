'use client';

import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Search } from 'lucide-react';
import { useFilterData, useSearchFacets } from '@/lib/graphql/units/hooks';
import { useProjects } from '@/lib/graphql/projects/hooks';
import { UnitFilter } from '@/lib/graphql/units/types';
import { Badge } from '@/components/ui/badge';

type FilterProps = {
  filters: UnitFilter;
  onChange: (filters: UnitFilter) => void;
};

export default function UnitFilters({ filters, onChange }: FilterProps) {
  const { data, loading } = useFilterData();
  const { getAmenityCounts, getRoomCounts, getPriceStats, getFloorAreaStats } =
    useSearchFacets(filters);

  // Use refs for debounce timers
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<UnitFilter>>({});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const projectSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local input state - only for controlled inputs
  const [inputValues, setInputValues] = useState({
    minPrice: '',
    maxPrice: '',
    minRooms: '',
    maxRooms: '',
    minFloorArea: '',
    maxFloorArea: '',
  });

  // For project search and pagination
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

  const projectsPerPage = 10;

  // Get facet counts
  const amenityCounts = getAmenityCounts();
  const roomCounts = getRoomCounts();
  const priceStats = getPriceStats();
  const floorAreaStats = getFloorAreaStats();

  // Use the project options hook
  const {
    projects: projectOptions,
    loading: projectsLoading,
    hasMore: hasMoreProjects,
    loadMore: handleLoadMoreProjects,
  } = useProjects({
    searchTerm: projectSearchTerm,
    limit: projectsPerPage,
  });

  // Update input values when filters change (from URL or parent component)
  useEffect(() => {
    setInputValues({
      minPrice: filters.minPrice !== undefined ? String(filters.minPrice) : '',
      maxPrice: filters.maxPrice !== undefined ? String(filters.maxPrice) : '',
      minRooms: filters.minRooms !== undefined ? String(filters.minRooms) : '',
      maxRooms: filters.maxRooms !== undefined ? String(filters.maxRooms) : '',
      minFloorArea:
        filters.minFloorArea !== undefined ? String(filters.minFloorArea) : '',
      maxFloorArea:
        filters.maxFloorArea !== undefined ? String(filters.maxFloorArea) : '',
    });
  }, [filters]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (projectSearchTimerRef.current)
        clearTimeout(projectSearchTimerRef.current);
    };
  }, []);

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
      debounceTimerRef.current = null;
    }

    const processedValue =
      type === 'number' ? (value ? Number(value) : undefined) : value;
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      [name]: processedValue !== '' ? processedValue : undefined,
    };

    const timer = setTimeout(() => {
      const pending = pendingChangesRef.current;
      pendingChangesRef.current = {};
      onChange({ ...filtersRef.current, ...pending });
    }, 500);

    debounceTimerRef.current = timer;
  };

  // Direct updates for multi-select/checkbox values (no debounce)
  const handleProjectsChange = (selectedIds: string[]) => {
    onChange({
      ...filters,
      projectIds: selectedIds.length > 0 ? selectedIds : undefined,
    });
  };

  const handleProjectSearch = (searchTerm: string) => {
    // Debounce project search
    if (projectSearchTimerRef.current) {
      clearTimeout(projectSearchTimerRef.current);
      projectSearchTimerRef.current = null;
    }

    const timer = setTimeout(() => {
      setProjectSearchTerm(searchTerm);
    }, 300);

    projectSearchTimerRef.current = timer;
  };

  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    const currentAmenities = filters.amenityIds || [];
    const newAmenities = checked
      ? [...currentAmenities, amenityId]
      : currentAmenities.filter((id) => id !== amenityId);

    onChange({
      ...filters,
      amenityIds: newAmenities.length > 0 ? newAmenities : undefined,
    });
  };

  // Format price or area ranges nicely
  const formatRange = (min?: number | null, max?: number | null) => {
    if (min !== undefined && min !== null && max !== undefined && max !== null)
      return `${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min !== undefined && min !== null) return `${min.toLocaleString()}+`;
    if (max !== undefined && max !== null)
      return `Up to ${max.toLocaleString()}`;
    return 'Any';
  };

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <div className='space-y-1'>
          <MultiSelect
            label='Projects'
            options={projectOptions.map((project) => ({
              id: project.id,
              label: `${project.name} | ${project.developer.name} `,
              value: project.id,
            }))}
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
          <div className='flex items-center text-xs text-muted-foreground mt-1'>
            <Search className='h-3 w-3 mr-1' />
            <span>Search by project or developer name</span>
          </div>
        </div>
      </div>

      <div className='space-y-2'>
        <Label>Price Range</Label>
        {priceStats && (
          <div className='text-xs text-muted-foreground mb-2'>
            Range: {formatRange(priceStats.min, priceStats.max)}
          </div>
        )}
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
        <div className='flex flex-wrap gap-2 mb-2'>
          {roomCounts.map((room) => (
            <Badge
              key={room.value}
              variant={
                filters.minRooms === room.value &&
                filters.maxRooms === room.value
                  ? 'default'
                  : 'outline'
              }
              className='cursor-pointer'
              onClick={() => {
                onChange({
                  ...filters,
                  minRooms: room.value,
                  maxRooms: room.value,
                });
              }}
            >
              {room.value} ({room.count})
            </Badge>
          ))}
        </div>
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
        {floorAreaStats && (
          <div className='text-xs text-muted-foreground mb-2'>
            Range: {formatRange(floorAreaStats.min, floorAreaStats.max)}
          </div>
        )}
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
          {data?.amenities?.map((amenity: any) => {
            const amenityCount =
              amenityCounts.find((ac) => ac.id === amenity.id)?.count || 0;
            return (
              <div key={amenity.id} className='flex items-center space-x-2'>
                <Checkbox
                  id={`amenity-${amenity.id}`}
                  checked={(filters.amenityIds || []).includes(amenity.id)}
                  onCheckedChange={(checked) =>
                    handleAmenityChange(amenity.id, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`amenity-${amenity.id}`}
                  className='flex justify-between w-full'
                >
                  <span>{amenity.name}</span>
                  <span className='text-xs text-muted-foreground'>
                    ({amenityCount})
                  </span>
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
