'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  UnitSortField,
  SortDirection,
  UnitSort,
} from '@/lib/graphql/units/types';

interface UnitSorterProps {
  sort: UnitSort;
  onSortChange: (sort: UnitSort) => void;
}

export default function UnitSorter({ sort, onSortChange }: UnitSorterProps) {
  // Default to CREATED_AT and DESC if not provided
  const sortField = sort.field || UnitSortField.CREATED_AT;
  const sortDirection = sort.direction || SortDirection.DESC;

  const handleSortFieldChange = (value: string) => {
    onSortChange({
      ...sort,
      field: value as UnitSortField,
      // Set a default direction if not already set
      direction: sort.direction || SortDirection.ASC,
    });
  };

  const handleSortDirectionChange = (value: string) => {
    onSortChange({
      ...sort,
      direction: value as SortDirection,
    });
  };

  return (
    <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-end w-full'>
      <div className='space-y-1.5 w-full'>
        <Label htmlFor='sort-field'>Sort by</Label>
        <Select value={sortField} onValueChange={handleSortFieldChange}>
          <SelectTrigger id='sort-field' className='w-full'>
            <SelectValue placeholder='Sort by...' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UnitSortField.NAME}>Name</SelectItem>
            <SelectItem value={UnitSortField.CREATED_AT}>
              Date created
            </SelectItem>
            <SelectItem value={UnitSortField.PRICE}>Price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-1.5 w-full'>
        <Label htmlFor='sort-direction'>Direction</Label>
        <Select value={sortDirection} onValueChange={handleSortDirectionChange}>
          <SelectTrigger id='sort-direction' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SortDirection.ASC}>Ascending</SelectItem>
            <SelectItem value={SortDirection.DESC}>Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
