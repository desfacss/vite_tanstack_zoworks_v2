// src/components/forms/ServiceReportForm.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Card,
  Select,
  message,
  Spin,
  Typography,
  Checkbox,
  // Drawer,
} from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import DisplayIdField from './DisplayIdField';
import SignatureWidget, { SignatureWidgetRef } from './SignatureWidget';
import { useQueryClient } from '@tanstack/react-query';

dayjs.extend(customParseFormat);

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

interface ServiceReportFormProps {
  editItem?: { id: string; task_id?: string }; // Added task_id to interface for safety
  onClose?: () => void;
}

interface LookupOption {
  value: string;
  label: string;
}

// New interface for Asset options
interface AssetOption {
  id: string;
  name: string;
  display_id: string | null;
}

const ServiceReportForm: React.FC<ServiceReportFormProps> = ({ editItem, onClose }) => {
  const taskId = editItem?.task_id || editItem?.id;
  console.log("zzz", taskId, editItem?.task_id, editItem?.id);
  const { user, location, organization } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<any | null>(null); // Changed type to any for simplicity
  const [displayId, setDisplayId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  // const [open, setOpen] = useState(false);
  const [paServiceTypeId, setPaServiceTypeId] = useState<string | null>(null);

  // State now correctly populated via robust logic
  const [technicianUsers, setTechnicianUsers] = useState<{ id: string; name: string }[]>([]);
  const [nonTechnicianUsers, setNonTechnicianUsers] = useState<{ id: string; name: string }[]>([]);
  
  // New state for Asset options
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);

  const technicianSignatureRef = useRef<SignatureWidgetRef>(null);
  const clientSignatureRef = useRef<SignatureWidgetRef>(null);

  const [lookupOptions, setLookupOptions] = useState<Record<string, LookupOption[]>>({
    serviceOfferingId: [],
    serviceType: [],
  });
  const queryClient = useQueryClient();

  const loadServiceTypes = useCallback(async (offeringId: string) => {
    if (!offeringId) {
      setLookupOptions(prev => ({ ...prev, serviceType: [] }));
      form.setFieldsValue({ serviceType: null });
      return;
    }

    const { data: offering, error } = await supabase
      .schema('organization')
      .from('service_offerings')
      .select('service_types')
      .eq('id', offeringId)
      .single();

    if (error || !offering?.service_types) {
      console.error('Error fetching service types:', error);
      message.error('Failed to load service types.');
      setLookupOptions(prev => ({ ...prev, serviceType: [] }));
    } else {
      const { data: types, error: typesError } = await supabase
        .schema('organization')
        .from('service_types')
        .select('id, name')
        .in('id', offering.service_types);

      if (typesError) {
        console.error('Error fetching service types details:', typesError);
        setLookupOptions(prev => ({ ...prev, serviceType: [] }));
      } else {
        const serviceTypesOptions = (types || []).map(t => ({ value: t.id, label: t.name }));
        setLookupOptions(prev => ({ ...prev, serviceType: serviceTypesOptions }));
      }
    }
  }, [form]);

  // Get geolocation
  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  }, []);

  // --- NEW ASSET FETCH LOGIC ---
  useEffect(() => {
    const fetchAssets = async () => {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .schema('external')
        .from('service_assets')
        .select('id, display_id')
        .eq('organization_id', organization.id);
console.log("gz",data);
      if (error) {
        console.error('Error fetching assets:', error);
        message.error('Failed to load assets list.');
      } else {
        setAssetOptions(data as AssetOption[] || []);
      }
    };
    fetchAssets();
  }, [organization?.id]);
  // -----------------------------


  useEffect(() => {
    if (!taskId || !organization?.id || !location?.id) {
      message.error('Missing required context (Task ID, Organization, or Location).');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch 'PA' service type ID
        const { data: paType, error: paTypeError } = await supabase
          .schema('organization')
          .from('service_types')
          .select('id')
          .eq('name', 'Paid Activity')
          .single();

        if (paTypeError) {
          console.error('Error fetching "PA" service type:', paTypeError);
          // Don't halt, just log and continue
        }
        setPaServiceTypeId(paType?.id || null);

        // Check for existing report
        const { data: existingReport, error: fetchError } = await supabase
          .schema('blueprint')
          .from('service_reports')
          .select('*')
          .eq('task_id', taskId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        console.log("ez", existingReport);
        
        if (existingReport) {
          // Edit mode
          setMode('edit');
          setReport(existingReport);
          setDisplayId(existingReport?.display_id);
           
          const details = existingReport?.details || {};

          // Parse the full datetime strings directly from the details object
          const inTime = details?.actual_start_at ? dayjs(details?.actual_start_at) : dayjs();
          const outTime = details?.actual_end_at ? dayjs(details?.actual_end_at) : dayjs();

          const initialData = {
            taskId: taskId,
            display_id: existingReport?.display_id,
            serviceDate: details?.service_date ? dayjs(details?.service_date) : dayjs(),
            inTime: inTime,
            outTime: outTime,
            description: details?.description,
            notes: details?.notes,
            // Technician field now expects an array of user_ids
            technician: existingReport?.assignee?.users || [], 
            client: {
                companyName: details?.account_name,
                email: details?.account_email,
                address: details?.account_address,
            },
            clientSignature: existingReport?.details?.account_contact_signature,
            technicianSignature: existingReport?.details?.agent_signature,
            serviceOfferingId: details?.offering_id,
            serviceType: details?.service_type_id,
            partsAwaited: details?.parts_awaited || false,
            observation: details?.observation || 'NA',
            partsRequired: details?.parts_required,
            assetId: details?.asset_id,
          };
          setAssetId(details?.asset_id);
          form.setFieldsValue(initialData);

                if (details.offering_id) {
                    await loadServiceTypes(details.offering_id);
                }
            } else {
                // Create mode - prepopulate from RPC
                setMode('create');
                const { data: rpcData, error: rpcError } = await supabase.rpc('prepopulate_service_report_v2', { p_task_id: taskId });
                if (rpcError) {
                    console.error('RPC Error:', rpcError);
                    throw rpcError;
                }
                console.log("ppq",rpcData);

          const prepopulated = rpcData;
          if (prepopulated) {
            const initialData = {
              taskId: prepopulated?.task_id,
              ticketId: prepopulated?.ticket_id,
              serviceDate: dayjs(),
              inTime: dayjs(),
              description: prepopulated?.details?.description,
              serviceOfferingId: prepopulated?.details?.offering_id,
              serviceType: prepopulated?.details?.service_type_id,
              // Technicians is an array field, so we wrap the single assignee if present
              technician: prepopulated?.assignee_id ? [prepopulated.assignee_id] : [], 
              client: {
                companyName: prepopulated?.details?.account_name,
                email: prepopulated?.details?.account_email,
                address: prepopulated?.details?.account_address,
              },
              partsAwaited: false,
              observation: 'NA',
              partsRequired: '',
              assetId: prepopulated?.details?.asset_id,
            };
            setAssetId(prepopulated?.details?.asset_id);
            form.setFieldsValue(initialData);
            if (prepopulated?.details?.offering_id) {
              await loadServiceTypes(prepopulated?.details?.offering_id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
        message.error('Failed to load service report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [taskId, form, organization?.id, location?.id, loadServiceTypes]);

  // Load static lookups for Service Offering
  useEffect(() => {
    const loadLookups = async () => {
      const { data: offerings, error: offeringsError } = await supabase
        .schema('organization')
        .from('service_offerings')
        .select('id, name, service_types');

      if (offeringsError) {
        console.error('Error fetching service offerings:', offeringsError);
        message.error('Failed to load service offerings.');
      } else {
        const serviceOfferingsOptions = (offerings || []).map(o => ({ value: o.id, label: o.name }));
        setLookupOptions(prev => ({ ...prev, serviceOfferingId: serviceOfferingsOptions }));
      }
    };

    if (organization?.id) {
      loadLookups();
    }
  }, [organization?.id]);

  // *** REVISED: Fetch Technicians AND Non-Technicians based on Organization Membership ***
  useEffect(() => {
    const fetchUsers = async () => {
      if (!organization?.id) return;
      
      // 1. Find the 'Technician' team ID within the organization
      const { data: technicianTeamData } = await supabase
        .schema('identity')
        .from('teams')
        .select('id')
        .eq('name', 'Technician')
        .eq('organization_id', organization?.id)
        .single();

      let technicianOrgUserIds: string[] = [];
      
      if (technicianTeamData) {
        // 2. Get all organization_user_ids belonging to that team ID
        const { data: userTeamLinks } = await supabase
          .schema('identity')
          .from('user_teams')
          .select('organization_user_id')
          .eq('team_id', technicianTeamData.id);
        
        if (userTeamLinks) {
          technicianOrgUserIds = userTeamLinks.map(item => item.organization_user_id);
        }
      }
      
      // 3. Fetch ALL active users in this organization
      const { data: orgUsersData, error: userError } = await supabase
        .schema('identity')
        .from('organization_users')
        .select('id, user_id, is_active')
        .eq('organization_id', organization?.id)
        .eq('is_active', true);

      if (userError) {
        console.error('Error fetching organization users:', userError);
        return;
      }

      // 4. Get names for all users in this org
      const userIds = orgUsersData.map(ou => ou.user_id);
      const { data: userNamesData } = await supabase
        .schema('identity')
        .from('users')
        .select('id, name')
        .in('id', userIds);
      
      const userMap = new Map(userNamesData?.map(u => [u.id, u.name]));

      // 5. Split the lists based on membership to 'Technician' team
      let techs: { id: string; name: string }[] = [];
      let nonTechs: { id: string; name: string }[] = [];

      orgUsersData.forEach(ou => {
        const userName = userMap.get(ou.user_id);
        if (userName) {
          const userEntry = { id: ou.user_id, name: userName }; // Storing user.id for Form value
          
          // Check if the organization_user_id is in the technician list
          if (technicianOrgUserIds.includes(ou.id)) {
            techs.push(userEntry);
          } else {
            nonTechs.push(userEntry);
          }
        }
      });
            
      setTechnicianUsers(techs);
      setNonTechnicianUsers(nonTechs);
      // You may want to set 'allUsers' to the combined list if needed elsewhere
    };

    fetchUsers();
  }, [organization?.id]);

  // Load static lookups for Service Offering
  useEffect(() => {
    const loadLookups = async () => {
      const { data: offerings, error: offeringsError } = await supabase
        .schema('organization')
        .from('service_offerings')
        .select('id, name, service_types');

      if (offeringsError) {
        console.error('Error fetching service offerings:', offeringsError);
        message.error('Failed to load service offerings.');
      } else {
        const serviceOfferingsOptions = (offerings || []).map(o => ({ value: o.id, label: o.name }));
        setLookupOptions(prev => ({ ...prev, serviceOfferingId: serviceOfferingsOptions }));
      }
    };

    if (organization?.id) {
      loadLookups();
    }
  }, [organization?.id]);

  const checkAndPromptForLocation = useCallback(async () => {
    if ('permissions' in navigator) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            if (permissionStatus.state === 'denied') {
                message.error('Location access is denied. Please enable it in your browser settings to record your service location.');
                return false;
            }
        } catch (error) {
            console.error('Failed to query geolocation permission:', error);
            // Fallback to the old method if querying permissions fails
            return true;
        }
    }
    // For browsers that don't support the Permissions API, or if permission is 'granted' or 'prompt'
    return true;
}, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
        // Check for location permission before proceeding in create mode
    if (mode === 'create') {
      const canGetLocation = await checkAndPromptForLocation();
      if (!canGetLocation) {
        setIsSubmitting(false);
        return; // Stop the submission process
      }
    }
      const values = await form.validateFields();

      // 1. Trigger signature uploads concurrently
      const [technicianSignatureUrl, clientSignatureUrl] = await Promise.all([
          technicianSignatureRef.current?.upload(),
          clientSignatureRef.current?.upload(),
      ]);

      // 2. Determine the stage_id based on the new logic
      let stageId: string;
      if (values.partsAwaited) {
          stageId = 'AwaitingParts';
      } else if (values.observation === '12HR' || values.observation === '24HR') {
          stageId = 'Observation';
      } else if (values.serviceType === paServiceTypeId) {
          stageId = 'Billable';
      } else {
          stageId = 'Resolved';
      }

      // Format the start time by combining the date and time from form values
      const actualStartAt = dayjs(values.serviceDate).hour(values.inTime.hour()).minute(values.inTime.minute()).second(values.inTime.second()).format('YYYY-MM-DD HH:mm:ss');
      const actualEndAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

      // Get geolocation only if in 'create' mode OR if location data is missing in 'edit' mode
      let locationData = null;
      const noLocationData = mode === 'create' || report?.details?.lat == null || report?.details?.lng == null
      if (noLocationData) {
        locationData = await getLocation();
      }
       
      // Find the full technician objects from the technicianUsers list
      const selectedTechnicians = technicianUsers.filter(user => values.technician?.includes(user.id));
      const assigneeArray = selectedTechnicians.map(user => ({ id: user.id, name: user.name }));

      const payload: any = {
        name: `Service Report - ${dayjs().format('DD/MM/YYYY')}`,
        details: {
          description: values.description,
          notes: values.notes,
          service_date: values.serviceDate ? values.serviceDate.format('YYYY-MM-DD') : null,
          actual_start_at: actualStartAt,
          actual_end_at: actualEndAt,
          account_name: values.client?.companyName,
          account_email: values.client?.email,
          account_address: values.client?.address,
          agent_signature: technicianSignatureUrl,
          account_contact_signature: clientSignatureUrl,
          offering_id: values.serviceOfferingId,
          service_type_id: values.serviceType,
          parts_awaited: values.partsAwaited,
          observation: values.observation,
          parts_required: values.partsRequired,
          asset_id: values.assetId,
          ...(noLocationData && locationData ? {
            lat: locationData.lat,
            lng: locationData.lng,
          } : {}),
        },
        stage_id: stageId,
        // Assuming 'assignee' field in the report table is structured like { users: [user_id1, user_id2] }
        assignee: { users: assigneeArray?.map(i => i.id) }, 
      };

      const { data, error } = await supabase.schema('organization').rpc('upsert_service_report_and_task_v2', {
        p_task_id: taskId,
        p_organization_id: organization?.id,
        p_location_id: location?.id,
        p_user_id: user?.id,
        p_payload: payload,
      });
      console.log("payload", {
        p_task_id: taskId,
        p_organization_id: organization?.id,
        p_location_id: location?.id,
        p_user_id: user?.id,
        p_payload: payload,
      });

      if (error) {
        throw error;
      }

      message.success(`Service Report ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error('Submission failed:', error);
      message.error(`Failed to save Service Report: ${error.message || 'An unknown error occurred'}`);
    } finally {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["tasks", organization?.id] });
      queryClient.invalidateQueries({ queryKey: ["service_reports", organization?.id] });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading service report data...</p>
      </div>
    );
  }
// const title = mode === 'edit' ? 'Edit Service Report' : 'Create Service Report';
   
  return (
    <div style={{ padding: '0px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="technician" label="Technicians (Reported By)">
                <Select placeholder="Select technician(s)" mode="multiple" showSearch>
                  {technicianUsers?.map(user => (
                    <Select.Option key={user.id} value={user.id}>
                      {user.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="serviceDate" label="Service Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled needConfirm={false} showTime={{ minuteStep: 15 }}/>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="inTime" label="Actual Start At">
                <DatePicker format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false} showTime={{ minuteStep: 15,format: 'HH:mm' }}/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="outTime" label="Actual End At">
                <DatePicker format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} disabled needConfirm={false} showTime={{ minuteStep: 15,format: 'HH:mm' }}/>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Client Details" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name={['client', 'companyName']} label="Company Name">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={['client', 'email']} label="Email">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name={['client', 'address']} label="Address">
                <TextArea rows={2} disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Service Details" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {/* --- NEW ASSET FIELD --- */}
            <Col xs={24} sm={8}>
              <Form.Item name="assetId" label="Asset">
                <Select placeholder="Select an Asset" showSearch allowClear
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {assetOptions.map(asset => (
                    <Option key={asset.id} value={asset.id}>
                      {`${asset.display_id ? `${asset.display_id}` : ''}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {/* ----------------------- */}
            <Col xs={24} sm={8}>
              <Form.Item name="serviceOfferingId" label="Service Offering" rules={[{ required: true, message: 'Service Offering is required' }]}>
                <Select
                  placeholder="Select Service Offering"
                  onChange={loadServiceTypes}
                >
                  {lookupOptions.serviceOfferingId.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="serviceType" label="Service Type" rules={[{ required: true, message: 'Service Type is required' }]}>
                <Select placeholder="Select Service Type">
                  {lookupOptions.serviceType.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="Service Description" rules={[{ required: true, message: 'Service Description is required' }]}>
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="notes" label="Internal Notes">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="observation" label="Observation">
                <Select placeholder="Select Observation">
                  <Option value="NA">N/A</Option>
                  <Option value="12HR">12 Hours</Option>
                  <Option value="24HR">24 Hours</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="clientSignature" label="Client Signature">
                <SignatureWidget ref={clientSignatureRef} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="partsRequired" label="Parts Required">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="partsAwaited" valuePropName="checked" noStyle>
                <Checkbox>Parts Awaited</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Scheduling & Assignment" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="assignee_id" label="Assignee (Non-Technician)">
                <Select
                  placeholder="Select an internal assignee"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {/* *** THIS IS THE FIX: Using nonTechnicianUsers *** */}
                  {nonTechnicianUsers?.map((user) => (
                    <Select.Option key={user.id} value={user.id}>
                      {user.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
              <Form.Item name="schedule" label="Schedule (Date & Time)">
                <DatePicker format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} needConfirm={false} showTime={{ minuteStep: 15 }}/>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? 'Create Report' : 'Update Report'}
            </Button>
            <Button onClick={onClose}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ServiceReportForm;