import { supabase } from '@/lib/supabase';

type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
};

/**
 * Uploads a file to Supabase storage
 * @param file File to upload
 * @param bucketName Storage bucket name
 * @param path Optional subfolder path within bucket
 * @returns Upload result with URL if successful
 */
export async function uploadFileToStorage(
  file: File,
  bucketName = 'images',
  path = 'property-images'
): Promise<UploadResult> {
  if (!file || !file.name) {
    return { success: false, error: 'Invalid file' };
  }

  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file',
    };
  }
}

/**
 * Uploads multiple files to Supabase storage
 * @param files Files to upload
 * @param bucketName Storage bucket name
 * @param path Optional subfolder path within bucket
 * @returns Array of upload results
 */
export async function uploadFilesToStorage(
  files: File[],
  bucketName = 'images',
  path = 'property-images'
): Promise<UploadResult[]> {
  if (!files || files.length === 0) {
    return [];
  }

  // Upload files in parallel
  const uploadPromises = files.map((file) =>
    uploadFileToStorage(file, bucketName, path)
  );

  return Promise.all(uploadPromises);
}
