-- 1. Grant usage on the identity schema to anonymous users
GRANT USAGE ON SCHEMA identity TO anon;

-- 2. Grant insert permissions on the organizations table
GRANT INSERT ON TABLE identity.organizations TO anon;

-- 3. Create RLS policy to allow insertion for requests
-- (Run this if you have Row Level Security enabled on this table)
CREATE POLICY "Allow public registration requests" ON identity.organizations
FOR INSERT TO anon
WITH CHECK (is_active = false);
