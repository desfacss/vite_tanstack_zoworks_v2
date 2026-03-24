-- RPC to confirm user password status
-- This is called after a successful password update to prevent further redirects.

CREATE OR REPLACE FUNCTION identity.confirm_user_password()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE identity.users
    SET password_confirmed = true,
        updated_at = now()
    WHERE auth_id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
