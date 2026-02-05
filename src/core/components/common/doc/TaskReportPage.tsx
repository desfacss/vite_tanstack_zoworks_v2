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
} from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import DisplayIdField from './DisplayIdField';
import SignatureWidget, { SignatureWidgetRef } from './SignatureWidget';
import { useQueryClient } from '@tanstack/react-query';

dayjs.extend(customParseFormat);

const { TextArea } = Input;
const { Option } = Select;

interface ServiceReportFormProps {
  editItem?: { id: string; task_id?: string };
  onClose?: () => void;
}

interface AssetOption {
  id: string;
  name: string;
  display_id: string | null;
}

const ServiceReportForm: React.FC<ServiceReportFormProps> = ({ editItem, onClose }) => {
  const taskId = editItem?.task_id || editItem?.id;
  const { user, location, organization } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [paServiceTypeId, setPaServiceTypeId] = useState<string | null>(null);
  const [technicianUsers, setTechnicianUsers] = useState<{ id: string; name: string }[]>([]);
  const [nonTechnicianUsers, setNonTechnicianUsers] = useState<{ id: string; name: string }[]>([]);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [lookupOptions, setLookupOptions] = useState<Record<string, {value:string, label:string}[]>>({
    serviceOfferingId: [],
    serviceType: [],
  });

  const technicianSignatureRef = useRef<SignatureWidgetRef>(null);
  const clientSignatureRef = useRef<SignatureWidgetRef>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (organization?.id) {
       fetchLookups();
       fetchUsers();
       fetchAssets();
    }
  }, [organization?.id]);

  const fetchLookups = async () => {
    const { data: offerings } = await supabase.schema('organization').from('service_offerings').select('id, name');
    setLookupOptions(prev => ({ ...prev, serviceOfferingId: (offerings || []).map(o => ({ value: o.id, label: o.name })) }));
  };

  const fetchUsers = async () => {
    if (!organization?.id) return;
    const { data: orgUsers } = await supabase.schema('identity').from('organization_users').select('user_id, id').eq('organization_id', organization.id).eq('is_active', true);
    if (!orgUsers) return;
    
    const { data: names } = await supabase.schema('identity').from('users').select('id, name').in('id', orgUsers.map(u => u.user_id));
    const userMap = new Map(names?.map(n => [n.id, n.name]));
    
    setTechnicianUsers(orgUsers.map(u => ({ id: u.user_id, name: userMap.get(u.user_id) || 'Unknown' })));
    setNonTechnicianUsers(orgUsers.map(u => ({ id: u.user_id, name: userMap.get(u.user_id) || 'Unknown' })));
  };

  const fetchAssets = async () => {
     if (!organization?.id) return;
     const { data } = await supabase.schema('external').from('service_assets').select('id, display_id').eq('organization_id', organization.id);
     setAssetOptions(data as AssetOption[] || []);
  };

  const loadServiceTypes = async (offeringId: string) => {
    const { data: offering } = await supabase.schema('organization').from('service_offerings').select('service_types').eq('id', offeringId).single();
    if (offering?.service_types) {
       const { data: types } = await supabase.schema('organization').from('service_types').select('id, name').in('id', offering.service_types);
       setLookupOptions(prev => ({ ...prev, serviceType: (types || []).map(t => ({ value: t.id, label: t.name })) }));
    }
  };

  useEffect(() => {
    if (!taskId || !organization?.id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: paType } = await supabase.schema('organization').from('service_types').select('id').eq('name', 'Paid Activity').single();
        setPaServiceTypeId(paType?.id || null);

        const { data: report } = await supabase.schema('blueprint').from('service_reports').select('*').eq('task_id', taskId).single();

        if (report) {
          setMode('edit');
          const details = report.details || {};
          form.setFieldsValue({
            taskId,
            display_id: report.display_id,
            serviceDate: dayjs(details.service_date),
            inTime: dayjs(details.actual_start_at),
            outTime: dayjs(details.actual_end_at),
            description: details.description,
            serviceOfferingId: details.offering_id,
            serviceType: details.service_type_id,
            technician: report.assignee?.users || [],
            client: {
              companyName: details.account_name,
              email: details.account_email,
              address: details.account_address,
            }
          });
          if (details.offering_id) await loadServiceTypes(details.offering_id);
        } else {
          setMode('create');
          const { data: prepopulated } = await supabase.rpc('prepopulate_service_report_v2', { p_task_id: taskId });
          if (prepopulated) {
             form.setFieldsValue({
               taskId: prepopulated.task_id,
               serviceDate: dayjs(),
               inTime: dayjs(),
               description: prepopulated.details?.description,
               client: {
                 companyName: prepopulated.details?.account_name,
                 email: prepopulated.details?.account_email,
                 address: prepopulated.details?.account_address,
               }
             });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [taskId, organization?.id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      const [techSig, clientSig] = await Promise.all([
        technicianSignatureRef.current?.upload(),
        clientSignatureRef.current?.upload(),
      ]);

      const payload = {
        name: `Service Report - ${dayjs().format('DD/MM/YYYY')}`,
        details: {
          ...values,
          agent_signature: techSig,
          account_contact_signature: clientSig,
          actual_start_at: values.inTime.format('YYYY-MM-DD HH:mm:ss'),
          actual_end_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        },
        assignee: { users: values.technician }
      };

      const { error } = await supabase.schema('organization').rpc('upsert_service_report_and_task_v2', {
        p_task_id: taskId,
        p_organization_id: organization?.id,
        p_location_id: location?.id,
        p_user_id: user?.id,
        p_payload: payload,
      });

      if (error) throw error;
      message.success('Saved');
      onClose?.();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  };

  if (loading) return <Spin />;

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Card size="small" title="General">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="technician" label="Technicians" mode="multiple">
              <Select placeholder="Select" mode="multiple">
                {technicianUsers.map(u => <Option key={u.id} value={u.id}>{u.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="serviceDate" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
        </Row>
      </Card>
      {/* Rest of the form structured similarly to dev4 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>Save</Button>
      </Form.Item>
    </Form>
  );
};

export default ServiceReportForm;