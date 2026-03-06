import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Settings,
  Globe,
  Clock,
  Shield,
  Bell,
  Zap,
  CreditCard,
  Users,
  Loader2,
  Save,
  Calendar,
} from 'lucide-react';
import { useToast } from '../../common/Toast';
import { detectUserTimezone, COMMON_TIMEZONES } from '../../../lib/utils/timezoneUtils';

interface SettingsTabProps {
  organizationId: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  metadata: any;
}

export function SettingsTab({ organizationId }: SettingsTabProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('general');
  const [timezone, setTimezone] = useState<string>('UTC');
  const { showToast } = useToast();

  useEffect(() => {
    if (organizationId) {
      loadOrganization();
    }
  }, [organizationId]);

  async function loadOrganization() {
    if (!organizationId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .schema('calendar')
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      setOrganization(data);
      setTimezone(data.timezone || 'UTC');
    } catch (error) {
      console.error('Error loading organization:', error);
      showToast('Failed to load organization settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveGeneral = async () => {
    if (!organizationId || !organization) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .schema('calendar')
        .from('organizations')
        .update({
          timezone,
        })
        .eq('id', organizationId);

      if (error) throw error;

      showToast('Settings saved successfully', 'success');
      loadOrganization();
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an organization to manage settings
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'scheduling', label: 'Scheduling', icon: Clock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">Manage organization configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="space-y-1 bg-white border border-gray-200 rounded-lg p-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${activeSection === section.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg p-6">
          {activeSection === 'general' && organization && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organization.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Slug
                </label>
                <input
                  type="text"
                  value={organization.slug}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs and public pages
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Default Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'scheduling' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Scheduling Configuration
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Round Robin Assignment</div>
                    <div className="text-sm text-gray-500">
                      Automatically distribute bookings fairly
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Geo-Clustering</div>
                    <div className="text-sm text-gray-500">
                      Assign based on location proximity
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Buffer Time</div>
                    <div className="text-sm text-gray-500">
                      Automatic padding between bookings
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Buffer Minutes
                  </label>
                  <input
                    type="number"
                    defaultValue="15"
                    min="0"
                    max="120"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Window (Days in Advance)
                  </label>
                  <input
                    type="number"
                    defaultValue="30"
                    min="1"
                    max="365"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h3>
                <p className="text-sm text-gray-500">
                  Connect external services to enhance functionality
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Google Calendar</h4>
                      <p className="text-xs text-gray-500">Sync bookings to Google Calendar</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Connect
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Outlook Calendar</h4>
                      <p className="text-xs text-gray-500">Sync bookings to Outlook</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    Connect
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Zapier</h4>
                      <p className="text-xs text-gray-500">Automate workflows</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    Connect
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center">
                      <Bell className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Slack</h4>
                      <p className="text-xs text-gray-500">Get booking notifications</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm">
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Configure security and access control policies
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-500">
                      Require 2FA for all admin users
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Session Timeout</div>
                    <div className="text-sm text-gray-500">
                      Auto-logout after period of inactivity
                    </div>
                  </div>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>Never</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Password Policy</div>
                    <div className="text-sm text-gray-500">
                      Minimum 8 characters, uppercase, lowercase, number
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">IP Whitelist</div>
                    <div className="text-sm text-gray-500">
                      Restrict admin access to specific IP addresses
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Configure
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audit Log Retention
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>180 days</option>
                    <option>1 year</option>
                    <option>Forever</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-4 h-4" />
                  <span>Save Security Settings</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Configure email and SMS notifications for bookings and events
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Email Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Booking Confirmation</div>
                        <div className="text-xs text-gray-500">Send to customer immediately</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">24h Reminder</div>
                        <div className="text-xs text-gray-500">Send 24 hours before appointment</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">1h Reminder</div>
                        <div className="text-xs text-gray-500">Send 1 hour before appointment</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Cancellation Notice</div>
                        <div className="text-xs text-gray-500">Send when booking is cancelled</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Admin Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">New Booking Alert</div>
                        <div className="text-xs text-gray-500">Notify admin of new bookings</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">No-Show Alert</div>
                        <div className="text-xs text-gray-500">Notify when customer doesn't show</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">SMS Notifications (Optional)</h4>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-3">
                      Connect Twilio to enable SMS notifications
                    </p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Configure Twilio
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-4 h-4" />
                  <span>Save Notification Settings</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Payments</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Manage payment processing and billing configuration
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Current Plan: Professional</h4>
                      <p className="text-sm text-gray-600">$49/month • Unlimited bookings</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment Gateway</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Connected</span>
                      </div>
                      <h5 className="font-medium text-gray-900">Stripe</h5>
                      <p className="text-xs text-gray-500 mt-1">Process payments securely</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors opacity-50">
                      <div className="flex items-center justify-between mb-2">
                        <CreditCard className="w-6 h-6 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Not Connected</span>
                      </div>
                      <h5 className="font-medium text-gray-900">PayPal</h5>
                      <p className="text-xs text-gray-500 mt-1">Alternative payment method</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pricing Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Collect Payment Upfront</div>
                        <div className="text-xs text-gray-500">Require payment at booking time</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Allow Cancellation Refunds</div>
                        <div className="text-xs text-gray-500">Refund within cancellation window</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="0"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Applied to all bookings (e.g., 8.5 for 8.5%)</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-4 h-4" />
                  <span>Save Billing Settings</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'team' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Management</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Invite team members and manage access permissions
                </p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">3 team members</span>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Users className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">JD</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">John Doe</div>
                      <div className="text-sm text-gray-500">john@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Owner</span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">SM</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Sarah Miller</div>
                      <div className="text-sm text-gray-500">sarah@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Admin</span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-orange-600">MJ</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Mike Johnson</div>
                      <div className="text-sm text-gray-500">mike@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Viewer</span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>• <strong>Owner:</strong> Full access to all features and settings</p>
                  <p>• <strong>Admin:</strong> Manage bookings, resources, and event types</p>
                  <p>• <strong>Manager:</strong> View and manage bookings only</p>
                  <p>• <strong>Viewer:</strong> Read-only access to bookings and reports</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
