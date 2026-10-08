type UploadResult = {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function uploadFileToStorage(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append('file', file);

  try {
    const response = await fetch(`${API_URL}/uploads/images`, {
      method: 'POST',
      body,
    });
    const data = await response.json();

    if (!response.ok) {
      const message = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message;
      return { success: false, error: message || 'Upload failed' };
    }

    return { success: true, url: data.url, path: data.key };
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' };
  }
}

export function uploadFilesToStorage(files: File[]): Promise<UploadResult[]> {
  return Promise.all(files.map(uploadFileToStorage));
}
