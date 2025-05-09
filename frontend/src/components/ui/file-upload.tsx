import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface FileUploadProps {
  onUpload: (url: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  maxSize?: number;
  bucketName?: string;
  path?: string;
}

export function FileUpload({
  onUpload,
  value,
  onChange,
  label = 'Upload file',
  maxFiles = 1,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  bucketName = 'images',
  path = 'property-images',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      try {
        setUploading(true);
        setError(null);

        const file = acceptedFiles[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;
        setPreview(publicUrl);

        // Call the onUpload and onChange callbacks
        onUpload?.(publicUrl);
        onChange?.(publicUrl);
      } catch (error: any) {
        console.error('Upload error:', error.message);
        setError(error.message || 'Error uploading file');
      } finally {
        setUploading(false);
      }
    },
    [bucketName, onUpload, onChange, path]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop: handleUpload,
      maxFiles,
      accept,
      maxSize,
    });

  const removeFile = useCallback(async () => {
    if (!preview) return;

    // Extract the file path from the URL
    const url = new URL(preview);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const filePath = `${path}/${fileName}`;

    try {
      // Delete from Supabase
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      setPreview(null);
      onUpload?.('');
      onChange?.('');
    } catch (error: any) {
      console.error('Delete error:', error.message);
      setError(error.message || 'Error deleting file');
    }
  }, [preview, bucketName, onUpload, onChange, path]);

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.name} className='text-sm text-red-500'>
      {file.name} - {errors.map((e) => e.message).join(', ')}
    </li>
  ));

  return (
    <div className='space-y-2'>
      {label && <Label>{label}</Label>}

      {preview ? (
        <div className='relative aspect-video rounded-md overflow-hidden'>
          <Image src={preview} alt='Preview' fill className='object-cover' />
          <Button
            size='icon'
            variant='destructive'
            className='absolute top-2 right-2 h-6 w-6'
            onClick={removeFile}
            disabled={uploading}
          >
            <X className='h-3 w-3' />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-6 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[150px] ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/20'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className='h-10 w-10 text-muted-foreground animate-spin mb-2' />
              <p className='text-sm text-muted-foreground'>Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className='h-10 w-10 text-muted-foreground mb-2' />
              <p className='text-sm text-muted-foreground mb-1'>
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop a file here, or click to select'}
              </p>
              <p className='text-xs text-muted-foreground'>
                Maximum file size: 10MB
              </p>
            </>
          )}
        </div>
      )}

      {fileRejectionItems.length > 0 && (
        <ul className='list-disc list-inside mt-2'>{fileRejectionItems}</ul>
      )}

      {error && <p className='text-sm text-red-500 mt-2'>{error}</p>}
    </div>
  );
}
