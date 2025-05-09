import React, { useState, useRef, useEffect } from 'react';
import { Badge } from './badge';
import { X, Search, Loader2 } from 'lucide-react';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { Input } from './input';

export type Option = {
  id: string;
  label: string;
};

type MultiSelectProps = {
  // Options can be loaded initially or progressively
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  label?: string;
  maxHeight?: number;
  className?: string;
  // New props for pagination and search
  onSearch?: (searchTerm: string) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  searchable?: boolean;
};

export function MultiSelect({
  options,
  selectedIds = [],
  onChange,
  placeholder = 'Select items',
  label,
  maxHeight = 200,
  className,
  onSearch,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  searchable = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const handleToggle = (optionId: string) => {
    const newSelectedIds = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];

    onChange(newSelectedIds);
  };

  const handleRemove = (optionId: string) => {
    onChange(selectedIds.filter((id) => id !== optionId));
  };

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (isOpen && onLoadMore && hasMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isLoading) {
            onLoadMore();
          }
        },
        { threshold: 0.5 }
      );

      if (loaderRef.current) {
        observerRef.current.observe(loaderRef.current);
      }

      return () => {
        if (observerRef.current && loaderRef.current) {
          observerRef.current.unobserve(loaderRef.current);
        }
      };
    }
  }, [isOpen, onLoadMore, isLoading, hasMore]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOptions = options.filter((option) =>
    selectedIds.includes(option.id)
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className='relative' ref={dropdownRef}>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='w-full px-3 py-2 border rounded-md text-left text-sm flex items-center justify-between'
        >
          <span
            className={selectedIds.length === 0 ? 'text-muted-foreground' : ''}
          >
            {selectedIds.length === 0
              ? placeholder
              : `${selectedIds.length} item${
                  selectedIds.length > 1 ? 's' : ''
                } selected`}
          </span>
          <span className='text-xs'>{isOpen ? '▲' : '▼'}</span>
        </button>

        {/* Selected options badges */}
        {selectedIds.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-2'>
            {selectedOptions.map((option) => (
              <Badge
                key={option.id}
                variant='secondary'
                className='flex items-center gap-1'
              >
                {option.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(option.id);
                  }}
                  className='hover:bg-gray-200 rounded-full p-0.5'
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Options dropdown */}
        {isOpen && (
          <div
            className='absolute z-10 w-full mt-1 border rounded-md bg-background shadow-md'
            style={{ maxHeight: maxHeight + 50 }}
          >
            {/* Search input */}
            {searchable && (
              <div className='p-2 border-b'>
                <div className='relative'>
                  <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='Search...'
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className='pl-8'
                  />
                </div>
              </div>
            )}

            <div className='overflow-y-auto p-2' style={{ maxHeight }}>
              {options.length === 0 ? (
                <div className='text-center py-2 text-muted-foreground'>
                  {isLoading ? 'Loading...' : 'No options available'}
                </div>
              ) : (
                <>
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className='flex items-center space-x-2 py-1'
                    >
                      <Checkbox
                        id={`option-${option.id}`}
                        checked={selectedIds.includes(option.id)}
                        onCheckedChange={() => handleToggle(option.id)}
                      />
                      <Label
                        htmlFor={`option-${option.id}`}
                        className='text-sm cursor-pointer'
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}

                  {/* Loading indicator for infinite scroll */}
                  {hasMore && (
                    <div ref={loaderRef} className='text-center py-2'>
                      {isLoading && (
                        <Loader2 className='h-4 w-4 animate-spin mx-auto' />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
