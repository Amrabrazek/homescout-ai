'use client';

import { ChangeEvent, useState } from 'react';
import { Button } from './button';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils/ui';

interface MediaUploaderProps {
  onImagesChange: (files: File[]) => void;
  initialImages?: Array<{ id?: string; url: string }>;
  maxFiles?: number;
  className?: string;
}

export function MediaUploader({
  onImagesChange,
  initialImages = [],
  maxFiles = 10,
  className,
}: MediaUploaderProps) {
  const [previews, setPreviews] = useState<
    Array<{ file?: File; preview: string; id?: string }>
  >(initialImages.map((img) => ({ preview: img.url, id: img.id })));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const newFiles = Array.from(e.target.files);
    const newFilePreviews = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updatedPreviews = [...previews, ...newFilePreviews].slice(
      0,
      maxFiles
    );
    setPreviews(updatedPreviews);

    // Extract all files from the updated previews
    const allFiles = updatedPreviews
      .filter((item) => item.file)
      .map((item) => item.file as File);

    onImagesChange(allFiles);
  };

  const removeImage = (index: number) => {
    const updatedPreviews = [...previews];

    // Release object URL to prevent memory leaks
    if (updatedPreviews[index].file) {
      URL.revokeObjectURL(updatedPreviews[index].preview);
    }

    updatedPreviews.splice(index, 1);
    setPreviews(updatedPreviews);

    // Extract all files from the updated previews
    const allFiles = updatedPreviews
      .filter((item) => item.file)
      .map((item) => item.file as File);

    onImagesChange(allFiles);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {previews.map((preview, index) => (
          <div
            key={index}
            className='relative aspect-square rounded-md overflow-hidden border'
          >
            <Image
              src={preview.preview}
              alt={`Preview ${index + 1}`}
              fill
              className='object-cover'
            />
            <Button
              variant='destructive'
              size='icon'
              className='absolute top-2 right-2 h-6 w-6'
              onClick={() => removeImage(index)}
            >
              <X size={14} />
            </Button>
          </div>
        ))}

        {previews.length < maxFiles && (
          <label className='cursor-pointer border border-dashed rounded-md flex flex-col items-center justify-center aspect-square hover:bg-slate-50 transition-colors'>
            <input
              type='file'
              multiple
              accept='image/*'
              className='hidden'
              onChange={handleFileChange}
              max={maxFiles - previews.length}
            />
            <Upload className='h-6 w-6 mb-2 text-gray-500' />
            <span className='text-sm text-gray-500'>Upload Images</span>
          </label>
        )}
      </div>
      <p className='text-sm text-gray-500'>
        {previews.length} of {maxFiles} images
      </p>
    </div>
  );
}
