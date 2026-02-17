-- 1. Grant usage on the necessary schemas
GRANT USAGE ON SCHEMA identity TO anon;
GRANT USAGE ON SCHEMA unified TO anon;
GRANT USAGE ON SCHEMA crm TO anon;

-- 2. Grant insert permissions on the organization tables
GRANT INSERT ON TABLE identity.organizations TO anon;
GRANT INSERT ON TABLE unified.organizations TO anon;
GRANT INSERT ON TABLE crm.accounts TO anon;
GRANT INSERT ON TABLE crm.contacts TO anon;

-- 3. Create RLS policies to allow insertion for registrations
-- identity.organizations
CREATE POLICY "Allow anon registration identity" ON identity.organizations
FOR INSERT TO anon
WITH CHECK (is_active = false);

-- unified.organizations
CREATE POLICY "Allow anon registration unified" ON unified.organizations
FOR INSERT TO anon
WITH CHECK (status = 'inactive' OR status = 'requested');

-- crm.accounts
CREATE POLICY "Allow anon registration accounts" ON crm.accounts
FOR INSERT TO anon
WITH CHECK (status = 'requested' AND intent_category = 'ONBOARDING_PENDING');

-- crm.contacts
CREATE POLICY "Allow anon registration contacts" ON crm.contacts
FOR INSERT TO anon
WITH CHECK (status = 'requested' AND intent_category = 'ONBOARDING_PENDING');
