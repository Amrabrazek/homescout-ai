import React, { useState, useRef, useEffect } from 'react';
import { Badge } from './badge';
import { X, Search, Loader2, ChevronDown } from 'lucide-react';
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
  // Option to retain selections that aren't in current options
  retainMissingSelections?: boolean;
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
  retainMissingSelections = true,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  // Track the full set of options we've seen
  const [allKnownOptions, setAllKnownOptions] = useState<
    Record<string, Option>
  >({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Keep track of all options we've seen to maintain labels for selected items
  // that might not be in the current visible options
  useEffect(() => {
    const newKnownOptions = { ...allKnownOptions };
    let hasNewOptions = false;

    options.forEach((option) => {
      if (
        !newKnownOptions[option.id] ||
        newKnownOptions[option.id].label !== option.label
      ) {
        newKnownOptions[option.id] = option;
        hasNewOptions = true;
      }
    });

    if (hasNewOptions) {
      setAllKnownOptions(newKnownOptions);
    }
  }, [options, allKnownOptions]);

  // Update filtered options when the main options change
  useEffect(() => {
    if (searchTerm && !onSearch) {
      // If there's a search term and we're filtering locally
      filterLocalOptions(searchTerm);
    } else {
      // Otherwise show all options
      setFilteredOptions(options);
    }
  }, [options, searchTerm]);

  // Clean up selectedIds that don't exist in options (unless retainMissingSelections is true)
  useEffect(() => {
    if (!retainMissingSelections) {
      const validIds = new Set(options.map((option) => option.id));
      const newSelectedIds = selectedIds.filter((id) => validIds.has(id));

      if (newSelectedIds.length !== selectedIds.length) {
        onChange(newSelectedIds);
      }
    }
  }, [options, selectedIds, onChange, retainMissingSelections]);

  // Local filtering function
  const filterLocalOptions = (term: string) => {
    if (term.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (onSearch) {
      // Use server-side search if provided
      onSearch(value);
    } else {
      // Filter locally otherwise
      filterLocalOptions(value);
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
    if (isOpen && onLoadMore && hasMore && !isLoading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMore();
          }
        },
        { threshold: 0.1 }
      );

      if (loaderRef.current) {
        observerRef.current.observe(loaderRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current?.disconnect();
        }
      };
    }
  }, [isOpen, onLoadMore, hasMore, isLoading, filteredOptions]);

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

  // Get selected options from all known options
  const selectedOptions = selectedIds.map((id) => {
    // First check current options
    const option = options.find((opt) => opt.id === id);
    if (option) return option;

    // Then check our known options cache
    if (allKnownOptions[id]) return allKnownOptions[id];

    // If not found anywhere, create a fallback
    return { id, label: id };
  });

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className='relative' ref={dropdownRef}>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full px-3 py-2 border rounded-md text-left text-sm flex items-center justify-between transition-colors',
            isOpen ? 'border-primary' : 'hover:border-gray-400'
          )}
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
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isOpen ? 'transform rotate-180' : ''
            )}
          />
        </button>

        {/* Selected options badges */}
        {selectedIds.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-2'>
            {selectedOptions.map((option) => (
              <Badge
                key={option.id}
                variant='secondary'
                className='flex items-center gap-1 animate-fadeIn'
              >
                {option.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(option.id);
                  }}
                  className='hover:bg-gray-200 rounded-full p-0.5 transition-colors'
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Options dropdown */}
        <div
          className={cn(
            'absolute z-10 w-full mt-1 border rounded-md bg-background shadow-md transition-all duration-200 origin-top',
            isOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          )}
          style={{ maxHeight: isOpen ? maxHeight + 50 : 0 }}
        >
          {/* Search input */}
          {searchable && (
            <div className='p-2 border-b sticky top-0 bg-background z-10'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search...'
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className='pl-8'
                  autoFocus={isOpen}
                />
                {isLoading && searchTerm && (
                  <Loader2 className='absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground' />
                )}
              </div>
            </div>
          )}

          <div
            className='overflow-y-auto p-2'
            style={{ maxHeight }}
            ref={contentRef}
          >
            {filteredOptions.length === 0 ? (
              <div className='text-center py-4 text-muted-foreground'>
                {isLoading ? (
                  <div className='flex flex-col items-center space-y-2'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    <span>Loading options...</span>
                  </div>
                ) : searchTerm ? (
                  'No matching options found'
                ) : (
                  'No options available'
                )}
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className='flex items-center space-x-2 py-1.5 px-1 rounded hover:bg-gray-50 transition-colors'
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
              </>
            )}

            {/* Loading indicator for infinite scroll */}
            {(hasMore || isLoading) && (
              <div ref={loaderRef} className='text-center py-3 mt-2 border-t'>
                <div className='flex items-center justify-center space-x-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='text-sm text-muted-foreground'>
                    {isLoading ? 'Loading options...' : 'Scroll for more'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
