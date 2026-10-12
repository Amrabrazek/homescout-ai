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

// Best match is search relevance, so it only exists while searching. Without
// a search the API's default order is newest first.
const BEST_MATCH = { value: 'best', label: 'Best match', sort: {} };

const OPTIONS: { value: string; label: string; sort: UnitSort }[] = [
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

function toValue(sort: UnitSort, searching: boolean): string {
  if (!sort.field) return searching ? BEST_MATCH.value : 'newest';
  const match = OPTIONS.find(
    (o) =>
      o.sort.field === sort.field &&
      (!o.sort.field ||
        o.sort.direction === (sort.direction ?? o.sort.direction))
  );
  return match?.value ?? 'newest';
}

interface UnitSorterProps {
  sort: UnitSort;
  onSortChange: (sort: UnitSort) => void;
  searching: boolean;
}

export default function UnitSorter({
  sort,
  onSortChange,
  searching,
}: UnitSorterProps) {
  const options = searching ? [BEST_MATCH, ...OPTIONS] : OPTIONS;
  return (
    <Select
      value={toValue(sort, searching)}
      onValueChange={(value) =>
        onSortChange(options.find((o) => o.value === value)?.sort ?? {})
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
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
