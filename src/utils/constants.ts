// src/lib/env.ts

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  WORKSPACE: string;
  
  LANGUAGE: string;
  THEME: string;
  API_BASE_URL: string;
  APP_URL: string;

  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  SUPPORT_TO_EMAIL: string;

  PUBLITIO_API_KEY: string;
  PUBLITIO_API_SECRET: string;
}

const env_def: EnvConfig = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  WORKSPACE: import.meta.env.VITE_WORKSPACE || '',
  
  LANGUAGE: import.meta.env.VITE_LANGUAGE || false,
  THEME: import.meta.env.VITE_THEME || false,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  APP_URL: import.meta.env.VITE_APP_URL || '',
  
  RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: import.meta.env.VITE_RESEND_FROM_EMAIL || '',
  SUPPORT_TO_EMAIL: import.meta.env.VITE_SUPPORT_TO_EMAIL || '',

  PUBLITIO_API_KEY: import.meta.env.VITE_PUBLITIO_API_KEY || '',
  PUBLITIO_API_SECRET: import.meta.env.VITE_PUBLITIO_API_SECRET || '',
};

// Optional: Log missing values in dev
// if (import.meta.env.DEV) {
//   Object.entries(env).forEach(([key, value]) => {
//     if (!value) {
//       console.warn(`[env] Missing value for ${key}`);
//     }
//   });
// }

export default env_def;
