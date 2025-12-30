// Publitio Storage Service
import Publitio from 'publitio_js_sdk';
import type { PublitioResponse, UploadConfig } from './types';

// Default upload configuration
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 10, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  maxFileNameLength: 100,
  maxFiles: 10,
};

// Lazy-initialized Publitio instance
let publitioInstance: Publitio | null = null;

/**
 * Get or initialize the Publitio SDK instance
 */
export const getPublitioInstance = (): Publitio => {
  if (!publitioInstance) {
    const apiKey = import.meta.env.VITE_PUBLITIO_API_KEY;
    const apiSecret = import.meta.env.VITE_PUBLITIO_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Publitio API credentials not configured');
    }
    
    publitioInstance = new Publitio(apiKey, apiSecret);
  }
  return publitioInstance;
};

/**
 * Compress and resize an image file
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 800px)
 * @returns Promise with the compressed file
 */
export const compressImage = (file: File, maxWidth = 800): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    
    reader.readAsDataURL(file);
    reader.onload = (e) => (img.src = e.target!.result as string);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const aspectRatio = img.height / img.width;
      
      canvas.width = maxWidth;
      canvas.height = maxWidth * aspectRatio;
      ctx.drawImage(img, 0, 0, maxWidth, maxWidth * aspectRatio);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        0.7
      );
    };
    
    img.onerror = (error) => reject(error);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Upload a file to Publitio
 * @param file - The file to upload
 * @param compress - Whether to compress images (default: true)
 * @returns Promise with the Publitio response
 */
export const uploadToPublitio = async (
  file: File,
  compress = true
): Promise<PublitioResponse> => {
  const publitio = getPublitioInstance();
  
  let fileToUpload = file;
  if (compress && file.type.startsWith('image/')) {
    fileToUpload = await compressImage(file);
  }
  
  const response = await publitio.uploadFile(fileToUpload);
  return response as PublitioResponse;
};

/**
 * Validate a file against upload configuration
 * @param file - The file to validate
 * @param config - Upload configuration
 * @returns Object with valid status and error message if invalid
 */
export const validateFile = (
  file: File,
  config: UploadConfig = DEFAULT_UPLOAD_CONFIG
): { valid: boolean; error?: string } => {
  if (file.size / 1024 / 1024 > config.maxFileSize) {
    return { valid: false, error: `File must be smaller than ${config.maxFileSize}MB` };
  }
  
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: `Only ${config.allowedTypes.join(', ')} files are allowed` };
  }
  
  if (file.name.length > config.maxFileNameLength) {
    return { valid: false, error: `File name must be less than ${config.maxFileNameLength} characters` };
  }
  
  return { valid: true };
};
