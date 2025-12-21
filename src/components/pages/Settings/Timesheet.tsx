import React, { useState, useEffect } from 'react';
import { Form, Button, Select, Switch, InputNumber, Collapse, message, Divider } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const { Panel } = Collapse;
const { Option } = Select;

interface TimesheetSettingsProps {
  locationId?: string;
}

interface TimesheetSettingsData {
  approvalWorkflow?: {
    defaultApprover?: string;
    timeLimitForApproval?: number;
    submissionEmail?: boolean;
    reviewEmail?: boolean;
  };
  workingHours?: {
    standardDailyHours?: number;
    maxOvertimeHours?: number;
    standardWeeklyHours?: number;
    projectFinalHours?: number;
  };
  contractWorkingHours?: {
    standardDailyHours?: number;
    maxOvertimeHours?: number;
    standardWeeklyHours?: number;
    projectFinalHours?: number;
  };
}

const TimesheetSettings: React.FC<TimesheetSettingsProps> = ({ locationId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const { organization } = useAuthStore();

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema('identity').from('organizations')
      .select('timesheet_settings')
      .eq('id', organization?.id)
      .single();

    if (error) {
      message.error('Failed to fetch settings');
    } else if (data?.timesheet_settings) {
      form.setFieldsValue(data.timesheet_settings);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (organization?.id) {
      fetchSettings();
    }
  }, [organization?.id]);

  const onFinish = async (values: TimesheetSettingsData) => {
    setLoading(true);
    const { error } = await supabase
      .schema('identity').from('organizations')
      .update({ timesheet_settings: values })
      .eq('id', organization?.id);

    if (error) {
      message.error('Failed to update settings');
    } else {
      message.success('Settings updated successfully');
    }
    setLoading(false);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout="vertical"
    >
      <Collapse defaultActiveKey={['1']}>
        <Panel forceRender header="Approval Workflow" key="1">
          <Form.Item
            name={['approvalWorkflow', 'defaultApprover']}
            label="Default Approver"
            rules={[{ required: true, message: 'Please select a default approver' }]}
          >
            <Select>
              <Option value="manager">Line Manager</Option>
              <Option value="hr">HR Partner</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name={['approvalWorkflow', 'timeLimitForApproval']}
            label="Time Limit for Approval (Days)"
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name={['approvalWorkflow', 'submissionEmail']}
            label="Send Email for Submission"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name={['approvalWorkflow', 'reviewEmail']}
            label="Send Email for Review"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Panel>
        <Panel forceRender header="Default Working Hours" key="3">
          <Form.Item
            name={['workingHours', 'standardDailyHours']}
            label="Standard Daily Hours"
          >
            <InputNumber min={1} max={24} disabled />
          </Form.Item>
          <Form.Item
            name={['workingHours', 'maxOvertimeHours']}
            label="Max Overtime Hours"
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name={['workingHours', 'standardWeeklyHours']}
            label="Standard Weekly Hours"
          >
            <InputNumber min={1} max={168} disabled />
          </Form.Item>
          <Form.Item
            name={['workingHours', 'projectFinalHours']}
            label="Project Warning Threshold(%)"
          >
            <InputNumber min={1} max={100} />
          </Form.Item>
        </Panel>
        <Panel forceRender header="Contract Working Hours" key="4">
          <Form.Item
            name={['contractWorkingHours', 'standardDailyHours']}
            label="Standard Daily Hours"
          >
            <InputNumber min={0} max={24} disabled />
          </Form.Item>
          <Form.Item
            name={['contractWorkingHours', 'maxOvertimeHours']}
            label="Max Overtime Hours"
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name={['contractWorkingHours', 'standardWeeklyHours']}
            label="Standard Weekly Hours"
          >
            <InputNumber min={0} max={168} disabled />
          </Form.Item>
          <Form.Item
            name={['contractWorkingHours', 'projectFinalHours']}
            label="Project Warning Threshold(%)"
          >
            <InputNumber min={1} max={100} />
          </Form.Item>
        </Panel>
      </Collapse>
      <Divider />
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Settings
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TimesheetSettings;