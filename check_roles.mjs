import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: orgs, error: orgsError } = await supabase
    .schema('identity')
    .from('organizations')
    .select('id, name');

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError);
    return;
  }
  console.log('Organizations:', orgs);

  const { data: roles, error: rolesError } = await supabase
    .schema('identity')
    .from('roles')
    .select('id, name, organization_id, is_active');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return;
  }
  console.log('All Roles count:', roles?.length);
  console.log('Roles list:', roles);
}

run();
