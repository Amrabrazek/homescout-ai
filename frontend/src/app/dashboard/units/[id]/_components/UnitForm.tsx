'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormPageHeader } from '@/components/ui/form-page-header';
import FormSectionFieldsContainer from '@/components/ui/form-section-fields-container';
import {
  FormInputField,
  FormTextareaField,
  PriceWithCurrencyFormField,
} from '@/components/ui/form-fields';
import { useToast } from '@/hooks/use-toast';
import { UnitFormValues, unitSchema } from '@/lib/graphql/units/schema';
import {
  createUnit,
  updateUnit,
  uploadImages,
} from '@/lib/graphql/units/actions';
import { ProjectSelector } from './ProjectSelector';
import { AmenitySelector } from './AmenitySelector';
import { MediaUploader } from '@/components/ui/media-uploader';
import { ArrowLeft, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Unit } from '@/lib/graphql/units/types';

interface UnitFormProps {
  unitData: Unit | null;
}

export function UnitForm({ unitData }: UnitFormProps) {
  const isEditing = !!unitData?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  // Set loading state to false once we have initialData

  // Form setup
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: unitData?.name || '',
      number: unitData?.number || '',
      floor: unitData?.floor || 1,
      rooms: unitData?.rooms || 1,
      bathrooms: unitData?.bathrooms || 1,
      floorArea: unitData?.floorArea || 80,
      price: unitData?.price || 500000,
      description: unitData?.description || '',
      projectId: unitData?.project?.id || '',
      amenityIds: unitData?.amenities?.map((amenity) => amenity.id) || [],
      imageIds: unitData?.images?.map((img) => img.id) || [],
    },
  });

  console.log('errors', form.formState.errors);
  console.log('form values', form.getValues());

  // Handle copy link to clipboard
  const handleCopyLink = () => {
    if (unitData?.id) {
      const url = `localhost:3000/unit/${unitData.id}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copied', {
        description: 'Unit link copied to clipboard',
      });
    }
  };

  // Get unit view URL
  const getUnitViewUrl = () => {
    if (unitData?.id) {
      return `/unit/${unitData.id}`;
    }
    return '#';
  };

  // Extra buttons for header
  const extraButtons = (
    <>
      {isEditing && unitData?.id && (
        <>
          <Button variant='outline' size='sm' asChild className='gap-1 h-10'>
            <Link
              href={getUnitViewUrl()}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center'
            >
              <ExternalLink size={16} />
              <span>View</span>
            </Link>
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCopyLink}
            className='gap-1 h-10'
          >
            <Copy size={16} />
            Copy Link
          </Button>
        </>
      )}
    </>
  );

  // Form submission handler
  const onSubmit = async (values: UnitFormValues) => {
    setIsSubmitting(true);

    console.log('values', values);

    try {
      // Upload images first if there are any
      let newImageIds: string[] = [];

      if (uploadFiles.length > 0) {
        const uploadToastId = toast.loading('Uploading images...');
        const uploadResult = await uploadImages(uploadFiles);

        if (uploadResult.success && uploadResult.data) {
          toast.dismiss(uploadToastId);
          toast.success('Images uploaded successfully');
          newImageIds = uploadResult.data.map((img: { id: string }) => img.id);
        } else {
          toast.dismiss(uploadToastId);
          toast.error('Failed to upload images');
          throw new Error(uploadResult.error || 'Failed to upload images');
        }
      }

      // Combine existing image IDs with new ones if needed
      const imageIds = [...(values.imageIds || []), ...newImageIds];

      console.log('imageIds', imageIds);

      // Create variables for the API call
      const formData = {
        id: unitData?.id,
        ...values,
        imageIds,
      };

      // Choose between create or update
      const saveToastId = toast.loading(
        isEditing ? 'Updating unit...' : 'Creating unit...'
      );

      console.log('isEditing', isEditing);

      const result =
        isEditing && unitData?.id
          ? await updateUnit(formData)
          : await createUnit(formData);

      console.log('result', result);

      if (result.success) {
        toast.dismiss(saveToastId);
        toast.success(
          `Unit ${result.data.name || ''} has been ${
            isEditing ? 'updated' : 'created'
          } successfully`
        );

        // Reset form if creating a new unit and staying on the page
        if (!isEditing) {
          form.reset();
          setUploadFiles([]);
        }
      } else {
        toast.dismiss(saveToastId);
        toast.error(
          `Failed to ${isEditing ? 'update' : 'create'} unit: ${result.error}`
        );
        throw new Error(
          result.error || `Failed to ${isEditing ? 'update' : 'create'} unit`
        );
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesChange = (files: File[]) => {
    setUploadFiles(files);
  };

  return (
    <div className='w-full max-w-none'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormPageHeader
            isEditing={isEditing}
            entityName='Unit'
            title={unitData?.name}
            redirectUrl='/dashboard/units'
            extraButtons={extraButtons}
            onSubmit={form.handleSubmit(onSubmit)}
            loading={isSubmitting}
          />

          <div className='space-y-6 py-6 px-4 md:px-8'>
            <FormSectionFieldsContainer
              title='Basic Information'
              subtitle='General unit details'
            >
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4'>
                <FormInputField
                  name='name'
                  title='Name'
                  i18nKey='unit.name'
                  placeholder='Luxury Penthouse'
                />
                <FormInputField
                  name='number'
                  title='Unit Number'
                  i18nKey='unit.number'
                  placeholder='A-101'
                />
                <div className='col-span-1 md:col-span-2'>
                  <FormTextareaField name='description' title='Description' />
                </div>
              </div>
            </FormSectionFieldsContainer>

            <FormSectionFieldsContainer
              title='Project Information'
              subtitle='Select the project this unit belongs to'
            >
              <div className='p-4'>
                <ProjectSelector
                  name='projectId'
                  label='Project'
                  selectedProject={unitData?.project}
                  disabled={isSubmitting}
                />
              </div>
            </FormSectionFieldsContainer>

            <FormSectionFieldsContainer
              title='Unit Features'
              subtitle='Size and facilities'
            >
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 p-4'>
                <FormInputField
                  name='floor'
                  title='Floor'
                  i18nKey='unit.floor'
                  type='number'
                />
                <FormInputField
                  name='rooms'
                  title='Rooms'
                  i18nKey='unit.rooms'
                  type='number'
                />
                <FormInputField
                  name='bathrooms'
                  title='Bathrooms'
                  i18nKey='unit.bathrooms'
                  type='number'
                />
                <FormInputField
                  name='floorArea'
                  title='Floor Area (sqm)'
                  i18nKey='unit.floorArea'
                  type='number'
                />
              </div>
            </FormSectionFieldsContainer>

            <FormSectionFieldsContainer
              title='Pricing'
              subtitle='Unit price information'
            >
              <div className='p-4'>
                <PriceWithCurrencyFormField
                  name='price'
                  currency='EGP'
                  title='Price'
                  minimum={0}
                />
              </div>
            </FormSectionFieldsContainer>

            <FormSectionFieldsContainer
              title='Amenities'
              subtitle='Unit amenities and features'
            >
              <div className='p-4'>
                <AmenitySelector
                  name='amenityIds'
                  label='Available Amenities'
                />
              </div>
            </FormSectionFieldsContainer>

            <FormSectionFieldsContainer
              title='Images'
              subtitle='Upload unit images'
            >
              <div className='p-4'>
                <MediaUploader
                  onImagesChange={handleImagesChange}
                  initialImages={unitData?.images?.map((img) => ({
                    id: img.id,
                    url: img.url,
                  }))}
                />
              </div>
            </FormSectionFieldsContainer>
          </div>
        </form>
      </Form>
    </div>
  );
}
