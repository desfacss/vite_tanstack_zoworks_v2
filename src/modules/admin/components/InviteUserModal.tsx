import React, { useEffect, useState } from "react";
import { Button, Drawer, Form, Spin, message } from "antd";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/core/lib/store";
import DynamicForm from "@/core/components/DynamicForm";
import env_def from "../../../utils/constants";
import { useQueryClient } from "@tanstack/react-query";

interface FormSchema {
  [key: string]: any;
}





const InviteUserModal: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [schema, setSchema] = useState<FormSchema | undefined>();
  const [loading, setLoading] = useState<boolean>(false);

  const [form] = Form.useForm();
  const { organization, user, location } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch form schema
  const getForms = async () => {
    const { data, error } = await supabase
      .schema('core')
      .from('forms')
      .select("*")
      .eq("name", "invite_user")
      .single();
    if (data) {
      setSchema(data);
    } else if (error) {
      message.error("Failed to fetch form schema.");
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
      ...rest
    } = values;

    const orgId = organization?.id;
    if (!orgId) {
      message.error("Organization context is missing. Cannot invite user.");
      setLoading(false);
      return;
    }

    try {
      // 1. Check if user exists globally in identity.users
      const { data: existingGlobalUser, error: checkGlobalError } = await supabase
        .schema("identity")
        .from("users")
        .select("id, auth_id")
        .eq("email", email)
        .maybeSingle();

      if (checkGlobalError) throw checkGlobalError;

      let authId = existingGlobalUser?.auth_id;

      // 2. If user doesn't exist globally, trigger Supabase Auth Invitation via Edge Function
      if (!existingGlobalUser) {
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite_users", {
          body: { email },
        });

        if (inviteError) {
          throw new Error(inviteError.message || "Failed to invite user via Auth service.");
        }

        authId = inviteData?.id;
      }

      // 3. Call the centralized RPC to handle all record creation/mapping
      const { data: rpcData, error: rpcError } = await supabase.schema('identity').rpc('invite_user_to_org', {
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_org_id: orgId,
        p_role_id: role_id,
        p_team_id: team_id,
        p_location_id: location_id,
        p_auth_id: authId,
        p_details: { 
          ...rest,
          // Explicitly pass fields that the RPC might use for HR profile
          firstName,
          lastName,
          email
        }
      });

      if (rpcError) throw rpcError;

      message.success(
        <>
          {firstName} {lastName} invited to {organization?.name} successfully.
          The user can accept the invite sent from their inbox!
        </>
      );

    } catch (error: any) {
      console.error("Invite Error:", error);
      message.error(error.message || "An error occurred while inviting the user.");
    } finally {
      setLoading(false);
      setIsDrawerOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["users", orgId] });
    }
  };

  useEffect(() => {
    if (isDrawerOpen) {
      getForms();
    }
  }, [isDrawerOpen]);
  console.log("lz", location, user);

  return (
    <>
      <Button
        type="primary"
        icon={<Plus size={16} />}
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
          {schema && (
            <DynamicForm
              schemas={schema as any}
              onFinish={handleInviteUser}
              formData={{ location_id: location?.id }}
            />
          )}
        </Spin>
      </Drawer>
    </>
  );
};

export default InviteUserModal;