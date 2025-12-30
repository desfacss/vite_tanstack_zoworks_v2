// Storage Service - Re-exports
export { 
  uploadToPublitio, 
  compressImage, 
  validateFile,
  getPublitioInstance,
  DEFAULT_UPLOAD_CONFIG 
} from './publitioService';

export type { 
  FileObject, 
  UploadConfig, 
  PublitioResponse 
} from './types';
