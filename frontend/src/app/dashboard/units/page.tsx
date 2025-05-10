'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Schema for form validation
const createUnitSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  number: z.string().min(1, { message: 'Number is required' }),
  floor: z.coerce
    .number()
    .int()
    .min(0, { message: 'Floor must be a positive number' }),
  rooms: z.coerce
    .number()
    .int()
    .positive({ message: 'Rooms must be a positive number' }),
  bathrooms: z.coerce
    .number()
    .int()
    .positive({ message: 'Bathrooms must be a positive number' }),
  floorArea: z.coerce
    .number()
    .positive({ message: 'Floor area must be a positive number' }),
  price: z.coerce
    .number()
    .positive({ message: 'Price must be a positive number' }),
  description: z.string().optional(),
  projectId: z.string().uuid({ message: 'Project is required' }),
  amenityIds: z.array(z.string()).optional(),
  imageIds: z.array(z.string()).optional(),
});

type CreateUnitFormValues = z.infer<typeof createUnitSchema>;

// GraphQL queries and mutations
const GET_FORM_DATA = gql`
  query GetFormData {
    projects {
      id
      name
      developer {
        id
        name
      }
    }
    amenities {
      id
      name
      icon
    }
    images {
      id
      url
      altText
    }
  }
`;

const CREATE_UNIT = gql`
  mutation CreateUnit($createUnitInput: CreateUnitInput!) {
    createUnit(createUnitInput: $createUnitInput) {
      id
      name
    }
  }
`;

export default function CreateUnitPage() {
  const router = useRouter();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const { toast } = useToast();

  // Form setup
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUnitFormValues>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      name: '',
      number: '',
      floor: 1,
      rooms: 1,
      bathrooms: 1,
      floorArea: 80,
      price: 500000,
      description: '',
      amenityIds: [],
      imageIds: [],
    },
  });

  // Data queries
  const { data, loading, error } = useQuery(GET_FORM_DATA);

  // Create unit mutation
  const [createUnit, { loading: creating }] = useMutation(CREATE_UNIT, {
    onCompleted: (data) => {
      toast({
        title: 'Success!',
        description: `Unit ${data.createUnit.name} has been created.`,
      });
      router.push(`/unit/${data.createUnit.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create unit: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: CreateUnitFormValues) => {
    // Add selected amenities and images
    values.amenityIds = selectedAmenities;
    values.imageIds = selectedImages;

    createUnit({
      variables: {
        createUnitInput: values,
      },
    });
  };

  // Toggle amenity selection
  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((current) =>
      current.includes(amenityId)
        ? current.filter((id) => id !== amenityId)
        : [...current, amenityId]
    );
  };

  // Toggle image selection
  const toggleImage = (imageId: string) => {
    setSelectedImages((current) =>
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId]
    );
  };

  if (error) {
    return (
      <div className='container mx-auto py-8 text-center'>
        <p className='text-red-500'>Error loading form data: {error.message}</p>
        <Button asChild className='mt-4'>
          <Link href='/'>Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8'>
      <Button variant='ghost' asChild className='mb-6 pl-0'>
        <Link href='/' className='flex items-center gap-2'>
          <ArrowLeft size={16} />
          Back to Listings
        </Link>
      </Button>

      <div className='bg-white p-6 rounded-lg shadow-sm'>
        <h1 className='text-2xl font-bold mb-6'>Create New Unit</h1>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Name */}
            <div className='space-y-2'>
              <Label htmlFor='name'>Name</Label>
              <Input id='name' {...register('name')} />
              {errors.name && (
                <p className='text-red-500 text-sm'>{errors.name.message}</p>
              )}
            </div>

            {/* Number */}
            <div className='space-y-2'>
              <Label htmlFor='number'>Unit Number</Label>
              <Input id='number' {...register('number')} />
              {errors.number && (
                <p className='text-red-500 text-sm'>{errors.number.message}</p>
              )}
            </div>

            {/* Floor */}
            <div className='space-y-2'>
              <Label htmlFor='floor'>Floor</Label>
              <Input id='floor' type='number' {...register('floor')} />
              {errors.floor && (
                <p className='text-red-500 text-sm'>{errors.floor.message}</p>
              )}
            </div>

            {/* Rooms */}
            <div className='space-y-2'>
              <Label htmlFor='rooms'>Rooms</Label>
              <Input id='rooms' type='number' {...register('rooms')} />
              {errors.rooms && (
                <p className='text-red-500 text-sm'>{errors.rooms.message}</p>
              )}
            </div>

            {/* Bathrooms */}
            <div className='space-y-2'>
              <Label htmlFor='bathrooms'>Bathrooms</Label>
              <Input id='bathrooms' type='number' {...register('bathrooms')} />
              {errors.bathrooms && (
                <p className='text-red-500 text-sm'>
                  {errors.bathrooms.message}
                </p>
              )}
            </div>

            {/* Floor Area */}
            <div className='space-y-2'>
              <Label htmlFor='floorArea'>Floor Area (sqm)</Label>
              <Input
                id='floorArea'
                type='number'
                step='0.01'
                {...register('floorArea')}
              />
              {errors.floorArea && (
                <p className='text-red-500 text-sm'>
                  {errors.floorArea.message}
                </p>
              )}
            </div>

            {/* Price */}
            <div className='space-y-2'>
              <Label htmlFor='price'>Price</Label>
              <Input id='price' type='number' {...register('price')} />
              {errors.price && (
                <p className='text-red-500 text-sm'>{errors.price.message}</p>
              )}
            </div>

            {/* Project */}
            <div className='space-y-2'>
              <Label htmlFor='projectId'>Project</Label>
              <Controller
                control={control}
                name='projectId'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select a project' />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value='loading' disabled>
                          Loading projects...
                        </SelectItem>
                      ) : (
                        data?.projects?.map((project: any) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.developer.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && (
                <p className='text-red-500 text-sm'>
                  {errors.projectId.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea id='description' rows={4} {...register('description')} />
          </div>

          {/* Amenities */}
          <div className='space-y-2'>
            <Label>Amenities</Label>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
              {loading ? (
                <p>Loading amenities...</p>
              ) : (
                data?.amenities?.map((amenity: any) => (
                  <div key={amenity.id} className='flex items-center space-x-2'>
                    <Checkbox
                      id={`amenity-${amenity.id}`}
                      checked={selectedAmenities.includes(amenity.id)}
                      onCheckedChange={() => toggleAmenity(amenity.id)}
                    />
                    <Label
                      htmlFor={`amenity-${amenity.id}`}
                      className='cursor-pointer'
                    >
                      {amenity.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Images */}
          <div className='space-y-2'>
            <Label>Images</Label>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {loading ? (
                <p>Loading images...</p>
              ) : (
                data?.images?.map((image: any) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${
                      selectedImages.includes(image.id)
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                    onClick={() => toggleImage(image.id)}
                  >
                    <img
                      src={image.url}
                      alt={image.altText || 'Property image'}
                      className='object-cover w-full h-full'
                    />
                    {selectedImages.includes(image.id) && (
                      <div className='absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1'>
                        <Plus size={16} className='rotate-45' />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <Button type='submit' className='w-full' disabled={creating}>
            {creating ? 'Creating Unit...' : 'Create Unit'}
          </Button>
        </form>
      </div>
    </div>
  );
}
