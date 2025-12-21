import React, { useEffect, useState } from "react";
import { Button, Drawer, Form, Spin, message, notification } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import DynamicForm from "../../common/DynamicForm";
import env_def from "../../../utils/constants";
import { useQueryClient } from "@tanstack/react-query";

interface FormSchema {
  [key: string]: any;
}

interface UserDetails {
  email?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  rate?: number;
  role_type?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
}

interface Role {
  id: string;
  role_name: string;
}

const InviteUserModal: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [schema, setSchema] = useState<FormSchema | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form] = Form.useForm();
  const { organization, user,location } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch form schema
  const getForms = async () => {
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("name", "invite_user")
      .single();
    if (data) {
      setSchema(data);
    } else if (error) {
      message.error("Failed to fetch form schema.");
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    const { data, error } = await supabase
      .schema("identity")
      .from("roles")
      .select("*")
      .eq("organization_id", organization?.id)
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching roles:", error);
      message.error("Failed to fetch roles.");
    } else {
      setRoles(data);
    }
  };

//   // Handle form submission
//   const handleInviteUser = async (values: any) => {
//   setLoading(true);
//   const {
//     email,
//     mobile,
//     firstName,
//     lastName,
//     role_id,
//     location_id,
//     team_id,
//     has_resigned,
//     last_date,
//     rate,
//     designation,
//     department,
//     joiningDate,
//     birthDate,
//     address,
//     emergencyContact,
//   } = values;

//   const role_type = roles?.find((r) => r.id === role_id)?.role_name;
//   const userName = `${firstName} ${lastName}`;
//   const payload = {
//     organization_id: organization?.id,
//     role_id,
//     details: {
//       rate,
//       role_id,
//       role_type,
//       email,
//       mobile,
//       lastName,
//       userName,
//       firstName,
//       has_resigned,
//       last_date,
//       designation,
//       department,
//       joiningDate,
//       birthDate,
//       address,
//       emergencyContact,
//     },
//     name: userName,
//     is_active: true,
//     location_id,
//     team_id: team_id ? [team_id] : [],
//     privacy: { groups: ["Contact Info"] },
//     profile_privacy: { "Contact Info": false },
//     subscriptions: {},
//     relationship_details: {},
//     post_read_statuses: {},
//     created_by: user?.id,
//     updated_by: user?.id,
//   };

//   try {
//     // Check if user already exists
//     const { data: existingUser, error: checkError } = await supabase
//       .schema("identity")
//       .from("users")
//       .select("id")
//       .eq("details->>email", email)
//       .eq("organization_id", organization?.id);

//     if (checkError && checkError?.code !== "PGRST116") throw checkError;
//     if (existingUser?.length > 0) {
//       message.warning("User with this email already exists.");
//       return;
//     }

//     // Invite user via Supabase function
//     const ANON_KEY = env_def?.SUPABASE_ANON_KEY || "your-anon-key-here";
//     const response = await fetch(`${env_def?.SUPABASE_URL}/functions/v1/invite_users`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${ANON_KEY}`,
//       },
//       body: JSON.stringify({ email }),
//     });

//     if (!response.ok) throw new Error("Failed to invite user.");
//     const inviteResponse = await response.json();
//     const authId = inviteResponse?.id;
//     const insertPayload = { ...payload, auth_id: authId };

//     // Insert user into the 'users' table
//     const { data: userData, error: insertError } = await supabase
//       .schema('identity_v2')
//       .from("users")
//       .insert([insertPayload])
//       .select('id')
//       .single();

//     if (insertError || !userData) throw insertError || new Error("Failed to create user record.");

//     const newUserId = userData.id;

//     // Insert a row into the 'user_roles' table
//     if (role_id) {
//       const { error: roleInsertError } = await supabase
//         .schema('identity_v2')
//         .from('user_roles')
//         .insert([{
//           user_id: newUserId,
//           role_id: role_id,
//           team_id: team_id,
//         }]);

//       if (roleInsertError) throw roleInsertError;
//     }

//     // Insert a row into the 'user_teams' table
//     if (team_id) {
//       const { error: teamInsertError } = await supabase
//         .schema('identity_v2')
//         .from('user_teams')
//         .insert([{
//           user_id: newUserId,
//           team_id: team_id,
//           created_by: user?.id,
//         }]);

//       if (teamInsertError) throw teamInsertError;
//     }

//     message.success(
//       <>
//         {payload.name} invited successfully. {payload.name} can accept the invite sent from Inbox/Spam folder!
//       </>
//     );
//   } catch (error: any) {
//     message.error(error.message || "An error occurred while inviting the user.");
//   } finally {
//     setLoading(false);
//     setIsDrawerOpen(false);
//     console.log("g1");
//     form.resetFields();
//     queryClient.invalidateQueries({ queryKey: ["users", organization?.id] });
//     console.log("g");
//   }
// };

  // ... (imports and component structure are kept the same)

// Function to handle the multi-step, multi-tenant user invitation
const handleInviteUser = async (values: any) => {
    setLoading(true);
    const {
        email,
        firstName,
        lastName,
        role_id,
        location_id,
        team_id,
        // ... other destructured values
        ...rest
    } = values;

    // --- 1. Prepare Common Payload Data ---
    const role_type = roles?.find((r) => r.id === role_id)?.role_name;
    const userName = `${firstName} ${lastName}`;
    const orgId =organization?.id;
    const currentUserId = user?.id; // The user performing the invite

    if (!orgId) {
        message.error("Organization context is missing. Cannot invite user.");
        setLoading(false);
        return;
    }

    let globalUserId: string | null = null;
    let organizationUserId: string | null = null;
    
    try {
        // --- 2. Check for Global Platform User Existence (users table) ---
        // We check the global 'users' table using the email stored in the 'details' jsonb.
        const { data: existingGlobalUser, error: checkGlobalError } = await supabase
            .schema("identity_v2")
            .from("users")
            .select("id")
            .eq("details->>email", email)
            .maybeSingle(); // Use maybeSingle for efficiency

        if (checkGlobalError && checkGlobalError.code !== "PGRST116") throw checkGlobalError;

        if (existingGlobalUser) {
            globalUserId = existingGlobalUser.id;
        }

        // --- 3. CORE LOGIC: Handle New vs. Existing Global User ---
        if (!globalUserId) {
            // SCENARIO A: NEW PLATFORM USER (Must invite via Supabase Auth)
            // The user doesn't exist in the global 'users' table.

            // 3a. Invite User via Supabase function (Auth layer)
            const ANON_KEY = env_def?.SUPABASE_ANON_KEY || "your-anon-key-here";
            const response = await fetch(`${env_def?.SUPABASE_URL}/functions/v1/invite_users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ANON_KEY}`,
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) throw new Error("Failed to invite user via Auth service.");
            const inviteResponse = await response.json();
            const authId = inviteResponse?.id;

            // 3b. Insert into global 'users' table
            const userPayload = {
                auth_id: authId,
                name: userName,
                details: {
                    email,
                    firstName,
                    lastName,
                    // ... include all other 'rest' fields here for global user details
                    ...rest
                },
                created_by: currentUserId,
                updated_by: currentUserId,
                // privacy, subscriptions, relationship_details, etc.
            };

            const { data: userData, error: insertUserError } = await supabase
                .schema('identity_v2')
                .from("users")
                .insert([userPayload])
                .select('id')
                .single();

            if (insertUserError || !userData) throw insertUserError || new Error("Failed to create global user record.");
            globalUserId = userData.id;

        } else {
            // SCENARIO B: EXISTING PLATFORM USER (Only need to check org association)
            // The user exists globally. Check if they are already in *this* organization.
            const { data: existingOrgUser, error: checkOrgUserError } = await supabase
                .schema("identity_v2")
                .from("organization_users")
                .select("id")
                .eq("user_id", globalUserId)
                .eq("organization_id", orgId)
                .maybeSingle();

            if (checkOrgUserError && checkOrgUserError.code !== "PGRST116") throw checkOrgUserError;

            if (existingOrgUser) {
                // User already exists in THIS organization. Prevent re-invite.
                message.warning(`${userName} is already a member of this organization.`);
                return;
            }
            // If we reach here, the user exists globally but is new to this organization.
        }

        // --- 4. Create Organization User Mapping (organization_users table) ---
        // This is the CRITICAL multi-tenant mapping step.
        const orgUserPayload = {
            organization_id: orgId,
            user_id: globalUserId, // Link to the global user
            location_id: location_id,
            is_active: true,
            // The user's role/team/designation details can also be stored here or left to the joins
            created_by: currentUserId,
            updated_by: currentUserId,
        };
        
        const { data: orgUserData, error: insertOrgUserError } = await supabase
            .schema('identity_v2')
            .from("organization_users")
            .insert([orgUserPayload])
            .select('id')
            .single();

        if (insertOrgUserError || !orgUserData) throw insertOrgUserError || new Error("Failed to create organization user mapping.");
        organizationUserId = orgUserData.id; // This is the ID used for user_roles and user_teams

        // --- 5. Assign Team Membership (user_teams table) ---
        if (team_id) {
            // Note: team_id must be a singular ID here as it's from the form
            const { error: teamInsertError } = await supabase
                .schema('identity_v2')
                .from('user_teams')
                .insert([{
                    organization_user_id: organizationUserId, // Use the new organization_user_id
                    team_id: team_id,
                    created_by: currentUserId,
                }]);

            if (teamInsertError) throw teamInsertError;
        }

        // --- 6. Assign Role Authorization (user_roles table) ---
        if (role_id && team_id) {
            // Role assignment MUST be specific to a team
            const { error: roleInsertError } = await supabase
                .schema('identity_v2')
                .from('user_roles')
                .insert([{
                    organization_user_id: organizationUserId, // Use the new organization_user_id
                    role_id: role_id,
                    team_id: team_id,
                }]);

            if (roleInsertError) throw roleInsertError;
        }


        // --- 7. Final Success Message ---
        message.success(
            <>
                {userName} invited to {organization?.name} successfully.
                The user can accept the invite sent from Inbox/Spam folder!
            </>
        );

    } catch (error: any) {
        // --- 8. Error Handling ---
        // In a production app, you would want transaction/rollback logic here.
        // For simplicity with standard Supabase client, we show the error.
        console.error("Invite Error:", error);
        message.error(error.message || "An error occurred while inviting the user.");
    } finally {
        setLoading(false);
        setIsDrawerOpen(false);
        form.resetFields();
        // Invalidate queries to refresh the user list
        queryClient.invalidateQueries({ queryKey: ["users", orgId] });
    }
};

  useEffect(() => {
    if (isDrawerOpen) {
      getForms();
      fetchRoles();
    }
  }, [isDrawerOpen]);
  console.log("lz",location,user);

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsDrawerOpen(true)}
      >
        Invite User
      </Button>
      <Drawer
        width={600}
        footer={null}
        title="Invite User"
        open={isDrawerOpen}
        closable={!loading}
        maskClosable={!loading}
        onClose={() => {
          setIsDrawerOpen(false);
          form.resetFields();
        }}
      >
        <Spin spinning={loading}>
          <DynamicForm schemas={schema} onFinish={handleInviteUser} formData={{location_id:location?.id}} form={form} />
        </Spin>
      </Drawer>
    </>
  );
};

export default InviteUserModal;