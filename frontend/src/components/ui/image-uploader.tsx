import { useState, useCallback, useRef } from 'react';
import { uploadFilesToStorage } from '@/lib/storage';
import { createImageEntity } from '@/lib/graphql/units/actions';
import { Card } from './card';
import { Progress } from './progress';
import {
  XIcon,
  ImageIcon,
  UploadIcon,
  MoveIcon,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

export type UploadStatus = 'idle' | 'uploading' | 'creating' | 'done' | 'error';

export interface ImageData {
  id: string;
  url: string;
  altText?: string;
}

interface ImageUploaderProps {
  onImagesUploaded: (images: ImageData[]) => void;
  initialImages?: ImageData[];
  maxFiles?: number;
  isDisabled?: boolean;
}

export function ImageUploader({
  onImagesUploaded,
  initialImages = [],
  maxFiles = 10,
  isDisabled = false,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<ImageData[]>(initialImages);

  // For image reordering
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverImage, setDragOverImage] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const removeImage = useCallback(
    (id: string) => {
      const updatedImages = images.filter((img: ImageData) => img.id !== id);
      setImages(updatedImages);
      onImagesUploaded(updatedImages);
    },
    [images, onImagesUploaded]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (
        isDisabled ||
        uploadStatus === 'uploading' ||
        uploadStatus === 'creating'
      ) {
        return;
      }

      // Validate files
      const validFiles = Array.from(files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (validFiles.length === 0) {
        toast.error('Please select valid image files');
        return;
      }

      // Check if adding these files would exceed the limit
      if (images.length + validFiles.length > maxFiles) {
        toast.error(`You can upload a maximum of ${maxFiles} images`);
        return;
      }

      try {
        // Step 1: Upload files to object storage
        setUploadStatus('uploading');
        const uploadToastId = toast.loading(
          `Uploading ${validFiles.length} images...`
        );
        const uploadResults = await uploadFilesToStorage(validFiles);

        // Check if any uploads failed
        const failedUploads = uploadResults.filter((result) => !result.success);

        if (failedUploads.length > 0) {
          toast.dismiss(uploadToastId);
          toast.error(`Failed to upload ${failedUploads.length} images`);
          if (failedUploads.length === validFiles.length) {
            setUploadStatus('error');
            return;
          }
        }

        // Step 2: Create image entities via GraphQL for successful uploads
        setUploadStatus('creating');
        const successfulUploads = uploadResults.filter(
          (result) => result.success && result.url
        );

        const newImages: ImageData[] = [];
        let completed = 0;

        for (const upload of successfulUploads) {
          if (!upload.url) continue;

          try {
            const result = await createImageEntity({
              url: upload.url,
              altText: validFiles[0]?.name || 'Uploaded image',
            });

            if (result.success && result.data) {
              newImages.push({
                id: result.data.id,
                url: result.data.url,
                altText: result.data.altText,
              });
            }
          } catch (error) {
            console.error('Failed to create image entity:', error);
          }

          completed++;
          setProgress(Math.round((completed / successfulUploads.length) * 100));
        }

        // Update state with new images
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);

        // Call callback with all images (existing + new)
        onImagesUploaded(updatedImages);

        toast.dismiss(uploadToastId);
        toast.success(`Successfully uploaded ${newImages.length} images`);
        setUploadStatus('done');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload images');
        setUploadStatus('error');
      } finally {
        setProgress(0);
        setTimeout(() => {
          setUploadStatus('idle');
        }, 2000);
      }
    },
    [images, isDisabled, maxFiles, onImagesUploaded, uploadStatus]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    },
    [processFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
      }
    },
    [processFiles]
  );

  const handleClick = useCallback(() => {
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) input.click();
  }, []);

  // Image reordering handlers
  const handleImageDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation(); // Prevent parent drag handler from firing
    setDraggedImage(id);
    // This is needed for Firefox
    e.dataTransfer.setData('text/plain', id);
    // Make the drag image transparent (not showing)
    const img = new Image();
    img.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleImageDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent drag handler from firing
    if (id !== draggedImage) {
      setDragOverImage(id);
    }
  };

  const handleImageDragEnd = () => {
    setDraggedImage(null);
    setDragOverImage(null);
  };

  const handleImageDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent drag handler from firing

    if (!draggedImage || draggedImage === targetId) {
      setDraggedImage(null);
      setDragOverImage(null);
      return;
    }

    // Reorder the images
    const newImages = [...images];
    const draggedIdx = newImages.findIndex((img) => img.id === draggedImage);
    const targetIdx = newImages.findIndex((img) => img.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [removed] = newImages.splice(draggedIdx, 1);
      newImages.splice(targetIdx, 0, removed);

      setImages(newImages);
      onImagesUploaded(newImages);
      toast.success('Image order updated');
    }

    setDraggedImage(null);
    setDragOverImage(null);
  };

  const isUploading =
    uploadStatus === 'uploading' || uploadStatus === 'creating';

  return (
    <div className='w-full space-y-4'>
      <div
        className={`relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-700'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={isDisabled ? undefined : handleDrop}
        onClick={isDisabled ? undefined : handleClick}
      >
        <input
          id='file-upload'
          type='file'
          className='hidden'
          onChange={handleFileChange}
          accept='image/*'
          multiple
          disabled={isDisabled || isUploading}
        />

        <div className='flex flex-col items-center'>
          {isUploading ? (
            <div className='w-full max-w-xs space-y-4'>
              <div className='flex items-center justify-center'>
                <UploadIcon className='w-10 h-10 text-gray-400 animate-pulse' />
              </div>
              <Progress value={progress} className='w-full' />
              <p className='text-sm text-center text-gray-500'>
                {uploadStatus === 'uploading'
                  ? 'Uploading images...'
                  : 'Creating image records...'}
              </p>
            </div>
          ) : (
            <>
              <ImageIcon className='w-10 h-10 text-gray-400 mb-2' />
              <p className='text-sm text-gray-500 text-center mb-1'>
                Drag & drop images here or click to upload
              </p>
              <p className='text-xs text-gray-400 text-center'>
                {images.length} of {maxFiles} images uploaded
              </p>
              {images.length > 1 && (
                <p className='text-xs text-gray-400 text-center mt-1'>
                  Drag images to reorder them
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
          {images.map((image: ImageData) => (
            <Card
              key={image.id}
              className={`relative group overflow-hidden transition-all ${
                draggedImage === image.id ? 'opacity-50' : ''
              } ${dragOverImage === image.id ? 'border-primary border-2' : ''}`}
              draggable={!isDisabled}
              onDragStart={(e: React.DragEvent) =>
                handleImageDragStart(e, image.id)
              }
              onDragOver={(e: React.DragEvent) =>
                handleImageDragOver(e, image.id)
              }
              onDragEnd={handleImageDragEnd}
              onDrop={(e: React.DragEvent) => handleImageDrop(e, image.id)}
            >
              <div className='aspect-square relative'>
                <img
                  src={image.url}
                  alt={image.altText || 'Uploaded image'}
                  className='object-cover w-full h-full rounded-md'
                />
                <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all'>
                  <GripVertical className='text-white opacity-0 group-hover:opacity-50 cursor-move' />
                </div>
                <button
                  className='absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity'
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  disabled={isDisabled}
                >
                  <XIcon className='h-4 w-4' />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
