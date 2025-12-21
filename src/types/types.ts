export interface ViewConfig {
    available_views?: string[];
    default_view?: string;
    filters?: any[]; // Adjust this type as per your actual filter structure
    dashboardview?: {
      measures?: any; // Adjust this type as per your actual measures structure
    };
    access_config?: {
      edit?: { roles?: string[]; users?: string[] };
      delete?: { roles?: string[]; users?: string[] };
      details?: { roles?: string[]; users?: string[] };
      [key: string]: { roles?: string[]; users?: string[] } | undefined; // Allow for other action types
    };
    details?: {
      name?: string;
      description?: string;
    };
    // ... other properties of your view config
  }