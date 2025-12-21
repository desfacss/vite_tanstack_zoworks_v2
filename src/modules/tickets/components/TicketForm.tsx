import React, { useEffect, useState, useRef } from 'react';
import { Form, Input, Select, Button, message, Spin, Modal, Space, DatePicker, Row, Col } from 'antd';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import FileUploader from '@/core/components/shared/ImageUploader';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

// ===================================================================================
// INTERFACES
// ===================================================================================
interface TicketFormProps {
  ticket_id?: string; // If provided, the form is in edit mode
  asset_id?: string;   // If provided, prefill fields based on asset data
  onSuccess?: () => void; // Callback after successful submission
}

interface FormData {
  subject: string;
  stage_id: string;
  priority_id?: string;
  account_id: string;
  category_id: string;
  contract_id?: string;
  assignee_id?: string;
  field_agent_id?: string;
  description?: string;
  location_id?: string;
  asset_id?: string;
  contact_id?: string;
  receiver_emails?: string[]; // New field for additional CC emails
  schedule?: dayjs.Dayjs;
}

interface NewContactFormData {
  name: string;
  email?: string;
  phone?: string;
}

interface ImageObject {
  url: string;
  thumbnail?: string;
  name: string;
  type: string;
  description: string;
  created_at: string;
  location?: { lat: number; lng: number };
}

// ===================================================================================
// COMPONENT DEFINITION
// ===================================================================================
const TicketForm: React.FC<TicketFormProps> = ({ ticket_id, asset_id, onSuccess }) => {
  // =================================================================================
  // STATE AND HOOKS INITIALIZATION
  // =================================================================================
  const { user, location, organization } = useAuthStore();
  const [form] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [contracts, setContracts] = useState<{ id: string; display_id: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [technicianUsers, setTechnicianUsers] = useState<{ id: string; name: string }[]>([]);
  const [nonTechnicianUsers, setNonTechnicianUsers] = useState<{ id: string; name: string }[]>([]);
  const [assets, setAssets] = useState<{ id: string; display_id: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [priorities, setPriorities] = useState<{ id: string; value: string; display_order: number }[]>([]);
  const [ticketStatus, setTicketStatus] = useState<any[]>([]); // Changed type to handle {id, name} structure
  const [isContactModalVisible, setIsContactModalVisible] = useState<boolean>(false);
  const imageUploaderRef = useRef<{ triggerUpload: () => Promise<ImageObject[]> }>(null);
  const isEditMode = !!ticket_id;
  const isAssetProvided = !!asset_id;
  const showAssetDropdown = !(!ticket_id && asset_id);
  const fieldAgentId = Form.useWatch('field_agent_id', form);
  const queryClient = useQueryClient();

  // =================================================================================
  // DATA FETCHING EFFECT
  // Fetches dropdown data and ticket details for edit mode or asset prefill.
  // =================================================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch clients (Assuming external.accounts is correct)
        const { data: clientData, error: clientError } = await supabase
          .schema('external')
          .from('accounts')
          .select('id, name')
          .eq('organization_id', organization?.id);
        if (clientError) throw new Error(`Failed to fetch clients: ${clientError.message}`);
        setClients(clientData || []);

        // Fetch categories (Assuming catalog.asset_categories is correct)
        const { data: categoryData, error: categoryError } = await supabase
          .schema('catalog')
          .from('asset_categories')
          .select('id, name');
        if (categoryError) throw new Error(`Failed to fetch categories: ${categoryError.message}`);
        setCategories(categoryData || []);

        // Fetch contracts (Assuming external.contracts is correct)
        const { data: contractData, error: contractError } = await supabase
          .schema('external')
          .from('contracts')
          .select('id, display_id')
          .eq('is_active', true);
        if (contractError) throw new Error(`Failed to fetch contracts: ${contractError.message}`);
        setContracts(contractData || []);

        // // Fetch users and split into technician and non-technician lists
        // const { data: teamsData } = await supabase.schema('identity').from('teams').select('id').eq('name', 'Technician').single();
        // let technicianUserIds: string[] = [];
        // if (teamsData) {
        //   const { data: userTeamsData } = await supabase.schema('identity').from('user_teams').select('organization_user_id').eq('team_id', teamsData.id);
        //   if (userTeamsData) {
        //     technicianUserIds = userTeamsData.map(item => item.organization_user_id);
        //   }
        // }
        
        // const { data: allUsersData, error: userError } = await supabase
        //   .schema('identity')
        //   .from('users')
        //   .select('id, name')
        //   // .eq('organization_id', organization?.id);
        // if (userError) throw new Error(`Failed to fetch users: ${userError.message}`);

        // const nonTechs = allUsersData?.filter(u => !technicianUserIds.includes(u.id)) || [];
        // const techs = allUsersData?.filter(u => technicianUserIds.includes(u.id)) || [];
        // setAllUsers(allUsersData || []);
        // setNonTechnicianUsers(nonTechs);
        // setTechnicianUsers(techs);
        // Example using the new view:



        // --- 1. Identify Technician Team Members (Organizational User IDs) ---
        const { data: technicianTeamData } = await supabase
          .schema('identity')
          .from('teams')
          .select('id')
          .eq('name', 'Technician')
          .eq('organization_id', organization?.id)
          .single();

        let technicianOrgUserIds: string[] = [];
        
        if (technicianTeamData) {
          const { data: userTeamLinks } = await supabase
            .schema('identity')
            .from('user_teams')
            .select('organization_user_id')
            .eq('team_id', technicianTeamData.id);
          
          if (userTeamLinks) {
            technicianOrgUserIds = userTeamLinks.map(item => item.organization_user_id);
          }
        }
        
        // --- 2. Fetch all active users in this organization (Organizational Users) ---
        const { data: orgUsersData, error: userError } = await supabase
          .schema('identity')
          .from('organization_users')
          .select('id, user_id, is_active')
          .eq('organization_id', organization?.id)
          .eq('is_active', true);

        if (userError) throw new Error(`Failed to fetch organization users: ${userError.message}`);

        // --- 3. Get all User Names in one efficient call ---
        let technicianUsersList: { id: string; name: string }[] = [];
        let nonTechnicianUsersList: { id: string; name: string }[] = [];

        if (orgUsersData) {
          const userIds = orgUsersData.map(ou => ou.user_id);
          const { data: userNamesData } = await supabase
            .schema('identity')
            .from('users')
            .select('id, name')
            .in('id', userIds);
          
          const userMap = new Map(userNamesData?.map(u => [u.id, u.name]));

          // --- 4. Split the lists based on membership to 'Technician' team ---
          orgUsersData.forEach(ou => {
            const userName = userMap.get(ou.user_id);
            if (userName) {
              // Use the core user ID (ou.user_id) for the form value
              const userEntry = { id: ou.user_id, name: userName };
              
              // Filter based on the organization_user_id (ou.id) being in the technician list
              if (technicianOrgUserIds.includes(ou.id)) {
                technicianUsersList.push(userEntry);
              } else {
                nonTechnicianUsersList.push(userEntry);
              }
            }
          });
        }
        
        setAllUsers(nonTechnicianUsersList.concat(technicianUsersList));
        setNonTechnicianUsers(nonTechnicianUsersList);
        setTechnicianUsers(technicianUsersList);
// const { data: technicianMembers, error: teamMemberError } = await supabase
//     .schema('identity')
//     .from('v_team_users')
//     .select('user_id, user_name')
//     .eq('organization_id', organization?.id)
//     .eq('team_name', 'Technician');

// if (teamMemberError) throw new Error(`Failed to fetch technicians: ${teamMemberError.message}`);

// // Map results directly to your state
// const technicianUsersList = technicianMembers.map(m => ({ id: m.user_id, name: m.user_name }));
// setTechnicianUsers(technicianUsersList);

        // Fetch priorities (Assuming organization.enums is correct)
        const { data: priorityData, error: priorityError } = await supabase
          .schema('organization')
          .from('enums')
          .select('id, value, display_order')
          .eq('value_type', 'priority')
          .eq('organization_id', organization?.id)
          .order('display_order');
        if (priorityError) throw new Error(`Failed to fetch priorities: ${priorityError.message}`);
        setPriorities(priorityData || []);

        // 1. Fetch the active ticket process blueprint
        const { data: activeBlueprintData, error: blueprintError } = await supabase
          .schema('automation')
          .from('bp_process_blueprints')
          .select('id')
          .eq('entity_type', 'tickets')
          .eq('is_active', true)
          .single();

        if (blueprintError) throw new Error(`Failed to fetch active ticket blueprint: ${blueprintError.message}`);
        if (!activeBlueprintData) throw new Error('No active blueprint found for tickets.');

        const activeBlueprintId = activeBlueprintData.id;

        // 2. Fetch all ESM definitions linked to this blueprint, ordered by version descending
        const { data: esmData, error: esmError } = await supabase
          .schema('automation')
          .from('esm_definitions')
          .select('definitions, version')
          .eq('blueprint_id', activeBlueprintId)
          .order('version', { ascending: false });

        if (esmError) throw new Error(`Failed to fetch ESM definitions: ${esmError.message}`);

        // 3. Get the latest version's definition (the first one after ordering)
        if (esmData && esmData.length > 0) {
          const latestEsm = esmData[0];
          if (latestEsm.definitions?.stages) {
            // Map to an object with both id and name for saving and display
            const statusOptions = latestEsm.definitions.stages.map((stage: any) => ({
              id: stage.id,
              name: stage.name,
            }));
            setTicketStatus(statusOptions);
            // *** IMPORTANT: Set default stage_id if not in edit mode ***
            if (!isEditMode && statusOptions.length > 0) {
              // Assuming the first stage is the desired default 'New'/'Open'
              form.setFieldsValue({ stage_id: statusOptions[0].id });
            }
          }
        } else {
          console.warn('No active ESM definition found for the active ticket blueprint.');
          setTicketStatus([]);
        }

        // Fetch assets if showAssetDropdown is true (Assuming external.service_assets is correct)
        if (showAssetDropdown) {
          const clientId = form.getFieldValue('account_id');
          let query = supabase
            .schema('external')
            .from('service_assets')
            .select('id, display_id')
            .eq('organization_id', organization?.id)
            .eq('is_active', true);
          if (clientId) {
            query = query.eq('account_id', clientId);
          }
          const { data: assetData, error: assetError } = await query;
          if (assetError) throw new Error(`Failed to fetch assets: ${assetError.message}`);
          setAssets(assetData || []);
        }

        // Fetch locations if location.is_default (Assuming organization.locations is correct)
        if (location?.is_default) {
          const { data: locationData, error: locationError } = await supabase
            .schema('organization')
            .from('locations')
            .select('id, name')
            .eq('organization_id', organization?.id);
          if (locationError) throw new Error(`Failed to fetch locations: ${locationError.message}`);
          setLocations(locationData || []);
        }

        // Fetch ticket data for edit mode
        if (isEditMode) {
          // *** CHANGE: Reference blueprint.tickets ***
          const { data: ticketData, error: ticketError } = await supabase
            .schema('blueprint')
            .from('tickets')
            .select('*, details, receivers')
            .eq('id', ticket_id)
            .single();
          if (ticketError) throw new Error(`Failed to fetch ticket: ${ticketError.message}`);
          if (ticketData) {
            form.setFieldsValue({
              subject: ticketData.subject,
              stage_id: ticketData.stage_id || 'New', // Default stage might need adjustment based on new options
              priority_id: ticketData.details?.priority_id,
              account_id: ticketData.account_id,
              category_id: ticketData.category_id,
              contract_id: ticketData.contract_id,
              assignee_id: ticketData.assignee_id,
              field_agent_id: ticketData.field_agent_id,
              description: ticketData.details?.description,
              location_id: ticketData.location_id,
              asset_id: ticketData.asset_id,
              contact_id: ticketData.contact_id,
              receiver_emails: ticketData.receivers?.emails || [], // Prefill receiver_emails
              // **CHANGE**: Convert reported_at (timestamp with time zone) or schedule to dayjs
              schedule: ticketData.details?.schedule ? dayjs(ticketData.details.schedule) : undefined,
            });
            // Fetch contacts for the ticket's account_id (Assuming external.contacts is correct)
            if (ticketData.account_id) {
              const { data: contactData, error: contactError } = await supabase
                .schema('external')
                .from('contacts')
                .select('id, name')
                .eq('account_id', ticketData.account_id);
              if (contactError) throw new Error(`Failed to fetch contacts: ${contactError.message}`);
              setContacts(contactData || []);
            }
          }
        } else {
          // Default to logged-in user as assignee for new tickets
          if (user?.id) {
            form.setFieldsValue({ assignee_id: user.id });
          }
        }

        // Prefill fields for asset_id (e.g., from QR code scan) (Assuming external.service_assets is correct)
        if (isAssetProvided && !isEditMode) {
          const { data: assetData, error: assetError } = await supabase
            .schema('external')
            .from('service_assets')
            .select('account_id, category_id, contract_id, location_id')
            .eq('id', asset_id)
            .single();
          if (assetError) throw new Error(`Failed to fetch asset: ${assetError.message}`);
          if (assetData) {
            form.setFieldsValue({
              account_id: assetData.account_id,
              category_id: assetData.category_id,
              contract_id: assetData.contract_id,
              location_id: assetData.location_id,
              asset_id,
            });
            // Fetch contacts for the asset's account_id
            const { data: contactData, error: contactError } = await supabase
              .schema('external')
              .from('contacts')
              .select('id, name')
              .eq('account_id', assetData.account_id);
            if (contactError) throw new Error(`Failed to fetch contacts: ${contactError.message}`);
            setContacts(contactData || []);
          }
        }
      } catch (err: any) {
        message.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (organization?.id) {
      fetchData();
    }
  }, [user, organization, ticket_id, asset_id, form, isEditMode, isAssetProvided, showAssetDropdown, location?.is_default]);

  // =================================================================================
  // EVENT HANDLERS
  // =================================================================================
  const handleClientChange = async (clientId: string) => {
    if (!clientId) {
      form.setFieldsValue({ contact_id: undefined, asset_id: undefined });
      setContacts([]);
      setAssets([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch contacts (Assuming external.contacts is correct)
      const { data: contactData, error: contactError } = await supabase
        .schema('external')
        .from('contacts')
        .select('id, name')
        .eq('account_id', clientId);
      if (contactError) throw new Error(`Failed to fetch contacts: ${contactError.message}`);
      setContacts(contactData || []);
      form.setFieldsValue({ contact_id: undefined });

      if (showAssetDropdown) {
        // Fetch assets (Assuming external.service_assets is correct)
        const { data: assetData, error: assetError } = await supabase
          .schema('external')
          .from('service_assets')
          .select('id, display_id')
          .eq('organization_id', organization?.id)
          .eq('account_id', clientId)
          .eq('is_active', true);
        if (assetError) throw new Error(`Failed to fetch assets: ${assetError.message}`);
        setAssets(assetData || []);
        form.setFieldsValue({ asset_id: undefined });
      }
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetChange = async (selectedAssetId: string) => {
    if (!selectedAssetId) {
      form.setFieldsValue({
        category_id: undefined,
        contract_id: undefined,
        location_id: undefined,
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch asset details (Assuming external.service_assets is correct)
      const { data: assetData, error: assetError } = await supabase
        .schema('external')
        .from('service_assets')
        .select('account_id, category_id, contract_id, location_id')
        .eq('id', selectedAssetId)
        .single();
      if (assetError) throw new Error(`Failed to fetch asset: ${assetError.message}`);
      if (assetData) {
        form.setFieldsValue({
          account_id: assetData.account_id,
          category_id: assetData.category_id,
          contract_id: assetData.contract_id,
          location_id: assetData.location_id,
          contact_id: undefined,
        });
        // Fetch contacts (Assuming external.contacts is correct)
        const { data: contactData, error: contactError } = await supabase
          .schema('external')
          .from('contacts')
          .select('id, name')
          .eq('account_id', assetData.account_id);
        if (contactError) throw new Error(`Failed to fetch contacts: ${contactError.message}`);
        setContacts(contactData || []);
      }
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (values: NewContactFormData) => {
    if (!user?.id || !organization?.id) {
      message.error('You must be logged in to create a contact.');
      return;
    }

    setLoading(true);
    try {
      const clientId = form.getFieldValue('account_id');
      if (!clientId) {
        throw new Error('Please select a client before creating a contact.');
      }

      // Insert into external.contacts (Assuming external.contacts is correct)
      const { data: newContact, error: contactError } = await supabase
        .schema('external')
        .from('contacts')
        .insert({
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          account_id: clientId,
          organization_id: organization.id,
          location_id: location.id,
          is_primary: false,
          details: {},
        })
        .select('id, name')
        .single();
      if (contactError) throw new Error(`Failed to create contact: ${contactError.message}`);

      setContacts((prev) => [...prev, newContact]);
      form.setFieldsValue({ contact_id: newContact.id });
      setIsContactModalVisible(false);
      contactForm.resetFields();
      message.success('Contact created successfully!');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: FormData) => {
    if (!user?.id || !organization?.id || !location?.id) {
      message.error('Missing user, organization, or location ID.');
      return;
    }

    setLoading(true);
    try {
      const uploadedImages: ImageObject[] = imageUploaderRef.current ? await imageUploaderRef.current.triggerUpload() : [];
      let newTicketId: string | null = null;

      if (!isEditMode) {
        // *** CHANGE: Using RPC to create. Assuming this RPC correctly inserts into blueprint.tickets ***
        const { data, error } = await supabase.schema('organization').rpc('tkt_wrapper_create_manual_ticket_v8', {
          p_organization_id: organization.id,
          p_location_id: location?.is_default ? values.location_id : location.id,
          p_account_id: values.account_id,
          p_contact_id: values.contact_id || null,
          p_receiver_emails: values.receiver_emails || [],
          p_created_by: user.id,
          p_assignee_id: values.assignee_id || null,
          p_field_agent_id: values.field_agent_id || null,
          p_subject: values.subject,
          p_description: values.description || null,
          p_status: values.stage_id || 'Open',
          p_stage_id: values.stage_id,
          p_category_id: values.category_id || null,
          p_asset_id: values.asset_id || asset_id || null,
          p_contract_id: values.contract_id || null,
          p_priority_id: values.priority_id || null,
          p_schedule_at: values.schedule?.toISOString() || null,
        });

        if (error) {
          console.error('RPC Error:', error);
          throw new Error(`Failed to create ticket: ${error.message}`);
        }

        const rpcResult = data as unknown as { ticketId: string };
        newTicketId = rpcResult.ticketId;
      } else {
        const ticketData = {
          subject: values.subject,
          stage_id: values.stage_id || 'open',
          account_id: values.account_id,
          category_id: values.category_id,
          contract_id: values.contract_id || null,
          assignee_id: values.assignee_id || null,
          field_agent_id: values.field_agent_id || null,
          location_id: location?.is_default ? values.location_id : location?.id,
          organization_id: organization?.id,
          // **CHANGE**: Using toISOString() on a dayjs object which inherently handles TZ if constructed correctly
          reported_at: new Date().toISOString(), 
          receivers: values.receiver_emails ? { emails: values.receiver_emails } : { emails: [] },
          details: {
            description: values.description || null,
            // **CHANGE**: Ensure schedule is ISO string for storage in JSONB
            schedule: values.schedule ? values.schedule.toISOString() : null, 
            priority_id: values.priority_id || null,
          },
          asset_id: values.asset_id || asset_id || null,
          contact_id: values.contact_id || null,
        };

        // *** CHANGE: Reference blueprint.tickets ***
        const { error: updateError } = await supabase
          .schema('blueprint')
          .from('tickets')
          .update(ticketData)
          .eq('id', ticket_id);
        if (updateError) throw new Error(`Failed to update ticket: ${updateError.message}`);

        // [NEW] After a successful update, call the sync function.
        const { error: syncError } = await supabase.rpc('tkt_utils_sync_conversation_receivers', {
          p_ticket_id: ticket_id,
        });

        if (syncError) {
          console.error('Failed to sync receivers:', syncError.message);
          message.warning('Ticket updated, but failed to sync all receivers.');
        }

        newTicketId = ticket_id;
      }

      if (uploadedImages.length > 0 && newTicketId) {
        // Assuming ent_attachments is in the public schema or another known schema
        const { error: imageError } = await supabase
          .from('ent_attachments') 
          .insert({
            entity_type: 'tickets',
            entity_id: newTicketId,
            images: uploadedImages,
            created_by: user.id,
          });
        if (imageError) throw new Error(`Failed to save images: ${imageError.message}`);
      }

      message.success(isEditMode ? 'Ticket updated successfully!' : 'Ticket created successfully!');
      queryClient.invalidateQueries({ queryKey: ["tickets", organization?.id] });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      message.error(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =================================================================================
  // RENDER METHOD
  // =================================================================================
  const asset = assets?.find(e => e?.id === asset_id);
  const title = `Create Ticket for ${asset?.display_id || asset?.id || 'Ticket'}`;

  return (
    <Spin spinning={loading}>
      <div>
        {/* <h1>{isEditMode && asset_id ? `Edit Ticket for ${asset?.display_id || asset?.id}` : title}</h1> */}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="account_id"
            label="Client"
            rules={[{ required: true, message: 'Please select a client' }]}
          >
            <Select
              placeholder="Select a client"
              disabled={(isAssetProvided || form.getFieldValue('asset_id')) && !isEditMode}
              showSearch
              onChange={handleClientChange}
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {clients.map((client) => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {showAssetDropdown && (
            <Form.Item name="asset_id" label="Asset">
              <Select
                placeholder="Select an asset"
                allowClear
                showSearch
                onChange={handleAssetChange}
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {assets.map((asset) => (
                  <Select.Option key={asset.id} value={asset.id}>
                    {asset.display_id}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter a subject' }]}
          >
            <Input placeholder="Enter ticket subject" />
          </Form.Item>
          <Form.Item name="description" label="Details">
            <Input.TextArea rows={4} placeholder="Enter additional details" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_id"
                label="Primary Contact"
                rules={[{ required: true, message: 'Please select a primary contact' }]}
              >
                <Select
                  placeholder="Select a contact"
                  allowClear
                  showSearch
                  disabled={!form.getFieldValue('account_id')}
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {contacts.map((contact) => (
                    <Select.Option key={contact.id} value={contact.id}>
                      {contact.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Button style={{ marginTop: 30 }} onClick={() => setIsContactModalVisible(true)} disabled={!form.getFieldValue('account_id')}>
                Add Contact
              </Button>
            </Col>
          </Row>
          <Form.Item
            name="receiver_emails"
            label="Additional Receivers (CC)"
            tooltip="Type an email and press Enter. These will be CC'd on communications."
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Add email addresses and press Enter"
              tokenSeparators={[',', ' ']}
            />
          </Form.Item>
          {location?.is_default && (
            <Form.Item
              name="location_id"
              label="Location"
              rules={[{ required: true, message: 'Please select a location' }]}
            >
              <Select
                placeholder="Select a location"
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {locations.map((loc) => (
                  <Select.Option key={loc.id} value={loc.id}>
                    {loc.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="category_id" label="Category">
            <Select
              placeholder="Select a category"
              disabled={(isAssetProvided || form.getFieldValue('asset_id')) && !isEditMode}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {categories.map((category) => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="contract_id" label="Contract">
            <Select
              placeholder="Select a contract"
              disabled={(isAssetProvided || form.getFieldValue('asset_id')) && !isEditMode}
              showSearch
              allowClear
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {contracts.map((contract) => (
                <Select.Option key={contract.id} value={contract.id}>
                  {contract.display_id}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {(!isAssetProvided || ticket_id) && (
            <>
              <h2>Scheduling</h2>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="assignee_id" label="Assignee">
                    <Select
                      placeholder="Select an assignee"
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {nonTechnicianUsers?.map((user) => (
                        <Select.Option key={user.id} value={user.id}>
                          {user.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  {fieldAgentId && (
                    <Form.Item name="schedule" label="Schedule (Date & Time)">
                      <DatePicker format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false} showTime={{ minuteStep: 15 }}/>
                    </Form.Item>
                  )}
                </Col>
              </Row>
            </>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority_id"
                label="Priority"
                rules={[{ required: true, message: 'Please select a priority' }]}
              >
                <Select
                  placeholder="Select priority"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {priorities?.map((priority) => (
                    <Select.Option key={priority.id} value={priority.id}>
                      {priority.value}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stage_id"
                label="Status"
                initialValue="New" // **CHANGE: Set default to 'New' which should exist in new stages**
                hidden={!isEditMode && isAssetProvided}
                rules={[{ required: true, message: 'Please select a status' }]}
              >
                <Select>
                  {ticketStatus?.map((status) => (
                    <Select.Option key={status.id} value={status.id}>
                      {status.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {(!isAssetProvided || ticket_id) && (
            <>
              <h2>Assignment & Scheduling</h2>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="field_agent_id" label="Field Technician">
                    <Select
                      placeholder="Select a field technician"
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {technicianUsers?.map((user) => (
                        <Select.Option key={user.id} value={user.id}>
                          {user.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="schedule" label="Schedule Date/Time">
                    <DatePicker 
                        format="YYYY-MM-DD HH:mm" 
                        style={{ width: '100%' }} 
                        needConfirm={false} 
                        showTime={{ minuteStep: 15 }}
                        // **CHANGE**: Only show schedule if a Field Agent is selected or if editing an existing ticket that had one
                        disabled={!fieldAgentId && !isEditMode} 
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {isAssetProvided && !ticket_id && <FileUploader ref={imageUploaderRef} autoUpload={false} onUploadComplete={() => {}} />}
          
          <Form.Item>
            <Button className="mt-2" type="primary" htmlType="submit" loading={loading}>
              {isEditMode ? 'Update Ticket' : 'Submit Ticket'}
            </Button>
          </Form.Item>
        </Form>
        <Modal
          title="Add New Contact"
          open={isContactModalVisible}
          onOk={() => contactForm.submit()}
          onCancel={() => {
            setIsContactModalVisible(false);
            contactForm.resetFields();
          }}
          okText="Create"
          cancelText="Cancel"
        >
          <Form form={contactForm} layout="vertical" onFinish={handleCreateContact}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter the contact name' }]}
            >
              <Input placeholder="Enter contact name" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input placeholder="Enter contact email" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Enter contact phone" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default TicketForm;