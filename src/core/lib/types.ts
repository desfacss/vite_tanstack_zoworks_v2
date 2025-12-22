

export interface Location {
  id: string;
  name: string;
  organization_id: string;
  details: Record<string, any>;
  is_active: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

export interface Organization {
  id: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  theme_config: Record<string, any> | null;
  subdomain: string | null;
  module_features: string[];
  details: Record<string, any>;
  app_settings: {
    name: string;
    workspace: string;
    customization?: {
      theme?: "true" | "false";
      language?: "true" | "false";
    };
  };
  user_profile_settings: Record<string, any>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  subscription_id: string | null;
  enabled_languages?: string[] | null;
  default_language?: string | null;
}

export interface User {
  user_id: string;
  organization_id: string;
  role_id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  details: Record<string, any>;
  last_synced_at: string | null;
  location_id: string | null;
  id: string | null;
  auth_id: string | null;
  name: string | null;
  is_active: boolean;
  roles?: {
    id: string;
    name: string;
    permissions: string[];
    is_sassadmin: boolean;
    ui_order: number;
    rls_policy: Record<string, any>;
    base_role: string;
    feature: Record<string, any>;
    is_active: boolean;
  };
}

export interface Module {
  id: string;
  name: string;
  prefix: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sub_modules: {
    customers?: boolean;
    users?: boolean;
    organizations?: boolean;
    subscriptions?: boolean;
  };
}

export interface Subscription {
  id: string;
  name: string;
  limits: Record<string, any>;
  module_features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null; // Added to match Organization pattern if needed, or keeping minimal
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  location_id: string | null;
  details: Record<string, any>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserTeam {
  user_id: string;
  team_id: string;
  created_at: string;
  created_by: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users: string[];
  locations: string[] | null;
  organization_id: string;
  start: string | null;
  expiry: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  avatar_url?: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}