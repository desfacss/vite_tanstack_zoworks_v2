import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, DoorOpen, Wrench, Truck, Package, Mail, Phone, Clock } from 'lucide-react';
import { COMMON_TIMEZONES } from '../../../lib/utils/timezoneUtils';
import { supabase } from '@/lib/supabase';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResourceFormData) => Promise<void>;
  initialData?: ResourceFormData & { id?: string; user_id?: string };
  organizationId: string;
}

export interface ResourceFormData {
  type: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  timezone: string;
  metadata: Record<string, any>;
  user_id?: string;
  organization_user_id?: string;
  userMode?: 'existing' | 'new';
}

const resourceTypes = [
  { value: 'person', label: 'Person', icon: User },
  { value: 'room', label: 'Room', icon: DoorOpen },
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'vehicle', label: 'Vehicle', icon: Truck },
  { value: 'asset', label: 'Asset', icon: Package },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'unavailable', label: 'Unavailable' },
];

export function ResourceFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  organizationId,
}: ResourceFormModalProps) {
  const [formData, setFormData] = useState<ResourceFormData>({
    type: 'person',
    name: '',
    email: '',
    phone: '',
    status: 'active',
    timezone: 'America/New_York',
    metadata: {},
  });

  const [userMode, setUserMode] = useState<'existing' | 'new'>('existing');
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [selectedOrgUserId, setSelectedOrgUserId] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.type === 'person') {
        if (initialData.user_id) {
          setUserMode('existing');
        } else {
          setUserMode('new');
        }
      }
    } else {
      setFormData({
        type: 'person',
        name: '',
        email: '',
        phone: '',
        status: 'active',
        timezone: 'America/New_York',
        metadata: {},
      });
      setUserMode('existing');
      setSelectedOrgUserId('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen && organizationId && formData.type === 'person') {
      const fetchOrgUsers = async () => {
        try {
          setIsLoadingUsers(true);
          const { data, error } = await supabase
            .schema('identity')
            .from('organization_users')
            .select(`
              id,
              user_id,
              users:users!organization_users_user_id_fkey (
                name,
                email,
                mobile
              )
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true);

          if (error) throw error;
          
          setOrgUsers(data || []);

          if (initialData?.user_id && data) {
            const matched = data.find(ou => ou.user_id === initialData.user_id);
            if (matched) {
              setSelectedOrgUserId(matched.id);
            }
          }
        } catch (err) {
          console.error('Error fetching organization users:', err);
        } finally {
          setIsLoadingUsers(false);
        }
      };

      fetchOrgUsers();
    }
  }, [isOpen, organizationId, formData.type, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.type === 'person' && userMode === 'existing' && !initialData?.id) {
      if (!selectedOrgUserId) {
        newErrors.selectedOrgUserId = 'Please select an organization user';
      }
    } else {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      if (formData.type === 'person') {
        if (!formData.email?.trim()) {
          newErrors.email = 'Email is required for people';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit({
        ...formData,
        userMode: formData.type === 'person' ? userMode : undefined,
        user_id: formData.type === 'person' && userMode === 'existing' ? formData.user_id : undefined,
        organization_user_id: formData.type === 'person' && userMode === 'existing' ? formData.organization_user_id : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to save resource. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (orgUserId: string) => {
    setSelectedOrgUserId(orgUserId);
    const selectedUser = orgUsers.find(ou => ou.id === orgUserId);
    if (selectedUser && selectedUser.users) {
      setFormData(prev => ({
        ...prev,
        name: selectedUser.users.name || '',
        email: selectedUser.users.email || '',
        phone: selectedUser.users.mobile || '',
        user_id: selectedUser.user_id,
        organization_user_id: selectedUser.id,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        email: '',
        phone: '',
        user_id: undefined,
        organization_user_id: undefined,
      }));
    }
  };

  const updateField = (field: keyof ResourceFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isPerson = formData.type === 'person';
  const isFieldsDisabled = isPerson && userMode === 'existing';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit Resource' : 'Add New Resource'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Type *
          </label>
          <div className="grid grid-cols-5 gap-3">
            {resourceTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateField('type', type.value)}
                  className={`flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-colors ${isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isPerson && !initialData?.id && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Option
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600 focus:ring-blue-500"
                  name="userMode"
                  value="existing"
                  checked={userMode === 'existing'}
                  onChange={() => {
                    setUserMode('existing');
                    setFormData(prev => ({
                      ...prev,
                      name: '',
                      email: '',
                      phone: '',
                      user_id: undefined,
                      organization_user_id: undefined,
                    }));
                    setSelectedOrgUserId('');
                  }}
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">Select Existing User</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600 focus:ring-blue-500"
                  name="userMode"
                  value="new"
                  checked={userMode === 'new'}
                  onChange={() => {
                    setUserMode('new');
                    setFormData(prev => ({
                      ...prev,
                      name: '',
                      email: '',
                      phone: '',
                      user_id: undefined,
                      organization_user_id: undefined,
                    }));
                    setSelectedOrgUserId('');
                  }}
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">Create New User</span>
              </label>
            </div>
          </div>
        )}

        {isPerson && userMode === 'existing' && !initialData?.id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select User *
            </label>
            <select
              value={selectedOrgUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.selectedOrgUserId ? 'border-red-500' : 'border-gray-300'
                }`}
              disabled={isLoadingUsers}
            >
              <option value="">-- Choose an Organization User --</option>
              {orgUsers.map((ou) => (
                <option key={ou.id} value={ou.id}>
                  {ou.users?.name || 'Unknown'} ({ou.users?.email || 'No Email'})
                </option>
              ))}
            </select>
            {errors.selectedOrgUserId && (
              <p className="mt-1 text-sm text-red-600">{errors.selectedOrgUserId}</p>
            )}
            {isLoadingUsers && (
              <p className="mt-1 text-xs text-gray-500">Loading users...</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={isFieldsDisabled}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
              } ${isFieldsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder={isPerson ? 'John Doe' : 'Resource name'}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email {isPerson && '*'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={isFieldsDisabled}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                  } ${isFieldsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="email@example.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                disabled={isFieldsDisabled}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isFieldsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : initialData?.id ? 'Update Resource' : 'Create Resource'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
