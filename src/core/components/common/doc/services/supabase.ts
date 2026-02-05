import { supabase } from "@/lib/supabase";

// Helper function to get current user's organization
export const getCurrentOrganization = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // In a real app, you'd fetch the user's organization from the users table
  // For now, we'll return a placeholder or handle it via the store in components
  return '55555555-5555-5555-5555-555555555555';
};
