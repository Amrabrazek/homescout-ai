/**
 * File validation utilities
 */

/**
 * Valid image mime types
 */
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Check if file type is valid
 */
export const isValidFileType = (mimetype: string): boolean => {
  return VALID_IMAGE_TYPES.includes(mimetype);
};

/**
 * Check if file size is valid
 */
export const isValidFileSize = (size: number): boolean => {
  return size <= MAX_FILE_SIZE;
};
