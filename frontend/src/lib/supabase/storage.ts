import { supabase } from '@/lib/supabase';

type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
};

// Max expiration time for Supabase signed URLs (60 days in seconds)
const MAX_EXPIRY_SECONDS = 60 * 24 * 60 * 60; // 60 days

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

    // Generate a signed URL with maximum allowed expiration (60 days)
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, MAX_EXPIRY_SECONDS);

    if (signedUrlError) {
      console.error('Signed URL generation error:', signedUrlError);
      return { success: false, error: signedUrlError.message };
    }

    return {
      success: true,
      url: signedUrlData.signedUrl,
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

/**
 * Gets a signed URL for a file in Supabase storage
 * @param filePath Path to the file in storage
 * @param bucketName Storage bucket name
 * @param expiresIn Expiration time in seconds (default: 60 days)
 * @returns Signed URL or null if there was an error
 */
export async function getSignedUrl(
  filePath: string,
  bucketName = 'images',
  expiresIn = MAX_EXPIRY_SECONDS
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return null;
  }
}
