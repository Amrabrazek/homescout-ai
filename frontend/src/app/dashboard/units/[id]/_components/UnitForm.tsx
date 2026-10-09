'use client';

import { useState, useEffect } from 'react';
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
import { RichTextFormFiled } from '@/components/rich-text/rich-text-form-fields';
import { UnitFormValues, unitSchema } from '@/lib/graphql/units/schema';
import {
  createUnit,
  updateUnit,
  deleteUnit,
} from '@/lib/graphql/units/actions';
import { ProjectSelector } from './ProjectSelector';
import { AmenitySelector } from './AmenitySelector';
import { ImageUploader, ImageData } from '@/components/ui/image-uploader';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Unit } from '@/lib/graphql/units/types';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

interface UnitFormProps {
  unitData: Unit | null;
}

export function UnitForm({ unitData }: UnitFormProps) {
  const router = useRouter();
  const isEditing = !!unitData?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>(
    unitData?.images?.map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText || undefined,
    })) || []
  );

  // For rich text description
  const [description, setDescription] = useState<string>(
    unitData?.description || ''
  );

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

  // Update form when description changes from rich text
  useEffect(() => {
    form.setValue('description', description, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [description, form]);

  // Handle description change
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
  };

  // Handle copy link to clipboard
  const handleCopyLink = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

  // Handle delete unit
  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!unitData?.id) return;

    setIsDeleting(true);
    try {
      const result = await deleteUnit(unitData.id);

      if (result.success) {
        toast.success('Unit deleted successfully');
        // Use window.location.href to refresh the page
        window.location.href = '/';
      } else {
        toast.error(`Failed to delete unit: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Extra buttons for header
  const extraButtons = (
    <>
      {isEditing && unitData?.id && (
        <>
          <Button variant='outline' size='sm' asChild className='h-10 gap-1 rounded-full'>
            <Link
              href={getUnitViewUrl()}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center'
            >
              <ExternalLink size={16} />
              <span className='hidden sm:inline'>View</span>
            </Link>
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCopyLink}
            className='h-10 gap-1 rounded-full'
          >
            <Copy size={16} />
            <span className='hidden sm:inline'>Copy Link</span>
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleDeleteClick}
            className='h-10 gap-1 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive'
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            <span className='hidden sm:inline'>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </span>
          </Button>
        </>
      )}
    </>
  );

  // Handle images uploaded callback
  const handleImagesUploaded = (images: ImageData[]) => {
    setUploadedImages(images);

    // Update the form with the new image IDs and mark as dirty
    const imageIds = images.map((img: ImageData) => img.id);
    form.setValue('imageIds', imageIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  // Form submission handler
  const onSubmit = async (values: UnitFormValues) => {
    setIsSubmitting(true);

    try {
      // Create variables for the API call including image IDs from state
      const formData = {
        id: unitData?.id,
        ...values,
        // Use the imageIds from our state to ensure correct order
        imageIds: uploadedImages.map((img: ImageData) => img.id),
      };

      // Choose between create or update
      const saveToastId = toast.loading(
        isEditing ? 'Updating unit...' : 'Creating unit...'
      );

      const result =
        isEditing && unitData?.id
          ? await updateUnit(formData)
          : await createUnit(formData);

      if (result.success) {
        toast.dismiss(saveToastId);
        toast.success(
          `Unit ${result.data.name || ''} has been ${
            isEditing ? 'updated' : 'created'
          } successfully`
        );

        // Handle redirect for new unit
        if (!isEditing) {
          // Navigate to the newly created unit's edit page
          router.push(`/dashboard/units/${result.data.id}`);
        } else {
          // For editing, just reset the form state
          setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  };

  // We want to disable form submission when images are being uploaded
  const isFormDisabled = isUploading || isSubmitting || isDeleting;

  return (
    <div className='w-full max-w-none'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormPageHeader
            isEditing={isEditing}
            entityName='Unit'
            title={unitData?.name}
            redirectUrl='/'
            extraButtons={extraButtons}
            onSubmit={form.handleSubmit(onSubmit)}
            loading={isFormDisabled}
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
                  <div className='flex flex-col gap-2'>
                    <Label>Description</Label>
                    <div>
                      <RichTextFormFiled
                        description={
                          form.getValues('description') ??
                          unitData?.description ??
                          undefined
                        }
                        changeFunc={handleDescriptionChange}
                      />
                    </div>
                  </div>
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
                  disabled={isFormDisabled}
                />
              </div>
            </FormSectionFieldsContainer>

            <FormSectionFieldsContainer
              title='Unit Features'
              subtitle='Size and facilities'
            >
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4'>
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
              subtitle='Upload and arrange unit images'
            >
              <div className='p-4'>
                <ImageUploader
                  onImagesUploaded={handleImagesUploaded}
                  initialImages={uploadedImages}
                  isDisabled={isSubmitting}
                  maxFiles={10}
                />
                {uploadedImages.length > 1 && (
                  <p className='text-xs text-muted-foreground mt-2'>
                    Tip: Drag and drop to reorder images. The first image will
                    be used as the unit thumbnail.
                  </p>
                )}
              </div>
            </FormSectionFieldsContainer>
          </div>
        </form>
      </Form>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the unit &quot;{unitData?.name}&quot;. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
