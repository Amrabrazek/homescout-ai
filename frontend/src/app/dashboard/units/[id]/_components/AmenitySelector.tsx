'use client';

import { useQuery } from '@apollo/client';
import { GET_FILTER_DATA } from '@/lib/graphql/units/queries';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
  icon?: string;
}

interface AmenitySelectorProps {
  name: string;
  label: string;
}

export function AmenitySelector({ name, label }: AmenitySelectorProps) {
  const { data, loading, error } = useQuery(GET_FILTER_DATA);

  if (error) {
    return <div>Error loading amenities: {error.message}</div>;
  }

  return (
    <FormField
      name={name}
      render={({ field }) => {
        const selectedAmenities: string[] = field.value ?? [];

        const toggleAmenity = (amenityId: string) => {
          field.onChange(
            selectedAmenities.includes(amenityId)
              ? selectedAmenities.filter((id) => id !== amenityId)
              : [...selectedAmenities, amenityId]
          );
        };

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {loading ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='h-6 w-6 animate-spin' />
              </div>
            ) : (
              <div className='grid grid-cols-2 md:grid-cols-4 gap-2 mt-2'>
                {data?.amenities?.map((amenity: Amenity) => (
                  <div key={amenity.id} className='flex items-center space-x-2'>
                    <Checkbox
                      id={`amenity-${amenity.id}`}
                      checked={selectedAmenities.includes(amenity.id)}
                      onCheckedChange={() => toggleAmenity(amenity.id)}
                    />
                    <FormLabel
                      htmlFor={`amenity-${amenity.id}`}
                      className='cursor-pointer'
                    >
                      {amenity.name}
                    </FormLabel>
                  </div>
                ))}
              </div>
            )}
          </FormItem>
        );
      }}
    />
  );
}
