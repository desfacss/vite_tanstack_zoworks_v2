// Storage Service Types

export interface FileObject {
  url: string;
  thumbnail?: string;
  name: string;
  type: string;
  description: string;
  created_at: string;
  location?: { lat: number; lng: number };
}

export interface UploadConfig {
  maxFileSize: number; // MB
  allowedTypes: string[];
  maxFileNameLength: number;
  maxFiles: number;
}

export interface PublitioResponse {
  url_preview: string;
  url_thumbnail?: string;
  id: string;
  public_id: string;
  title: string;
  [key: string]: any;
}
