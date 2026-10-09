'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UnitSortField,
  SortDirection,
  UnitSort,
} from '@/lib/graphql/units/types';

const OPTIONS: { value: string; label: string; sort: UnitSort }[] = [
  { value: 'best', label: 'Best match', sort: {} },
  {
    value: 'newest',
    label: 'Newest',
    sort: { field: UnitSortField.CREATED_AT, direction: SortDirection.DESC },
  },
  {
    value: 'price-asc',
    label: 'Price: low to high',
    sort: { field: UnitSortField.PRICE, direction: SortDirection.ASC },
  },
  {
    value: 'price-desc',
    label: 'Price: high to low',
    sort: { field: UnitSortField.PRICE, direction: SortDirection.DESC },
  },
  {
    value: 'name',
    label: 'Name A to Z',
    sort: { field: UnitSortField.NAME, direction: SortDirection.ASC },
  },
];

function toValue(sort: UnitSort): string {
  const match = OPTIONS.find(
    (o) =>
      o.sort.field === sort.field &&
      (!o.sort.field ||
        o.sort.direction === (sort.direction ?? o.sort.direction))
  );
  return match?.value ?? 'best';
}

interface UnitSorterProps {
  sort: UnitSort;
  onSortChange: (sort: UnitSort) => void;
}

export default function UnitSorter({ sort, onSortChange }: UnitSorterProps) {
  return (
    <Select
      value={toValue(sort)}
      onValueChange={(value) =>
        onSortChange(OPTIONS.find((o) => o.value === value)?.sort ?? {})
      }
    >
      <SelectTrigger
        aria-label='Sort'
        className='h-9 w-auto gap-2 rounded-full border-0 bg-transparent px-2 text-sm font-semibold shadow-none'
      >
        <span className='text-muted-foreground font-medium'>Sort:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align='end'>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
