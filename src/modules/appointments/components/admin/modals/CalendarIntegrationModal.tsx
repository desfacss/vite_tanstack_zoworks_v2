import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Calendar, Check, X, RefreshCw, Loader2, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '../../common/Toast';

interface CalendarIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
}

interface CalendarIntegration {
  id: string;
  provider: string;
  provider_account_email?: string;
  is_active: boolean;
  sync_direction: string;
  last_sync_at?: string;
  last_sync_status: string;
  auto_sync_enabled: boolean;
}

const providerInfo = {
  google: {
    name: 'Google Calendar',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Sync with your Google Calendar',
  },
  microsoft: {
    name: 'Microsoft Outlook',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    description: 'Sync with Outlook Calendar',
  },
  apple: {
    name: 'Apple iCloud',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    description: 'Sync with Apple Calendar',
  },
  ical: {
    name: 'iCal Feed',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Connect via iCal URL',
  },
};

export function CalendarIntegrationModal({
  isOpen,
  onClose,
  resourceId,
  resourceName,
}: CalendarIntegrationModalProps) {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && resourceId) {
      loadIntegrations();
    }
  }, [isOpen, resourceId]);

  async function loadIntegrations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('calendar')
        .from('calendar_integrations')
        .select('*')
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading calendar integrations:', error);
      showToast('Failed to load calendar integrations', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleConnectCalendar = (provider: string) => {
    showToast(
      `OAuth flow for ${providerInfo[provider as keyof typeof providerInfo].name} will be implemented. For now, this is a UI demo.`,
      'info'
    );
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .schema('calendar')
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      showToast('Calendar disconnected successfully', 'success');
      loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      showToast('Failed to disconnect calendar', 'error');
    }
  };

  const handleToggleActive = async (integration: CalendarIntegration) => {
    try {
      const { error } = await supabase
        .schema('calendar')
        .from('calendar_integrations')
        .update({ is_active: !integration.is_active })
        .eq('id', integration.id);

      if (error) throw error;

      showToast(
        `Calendar ${!integration.is_active ? 'enabled' : 'disabled'} successfully`,
        'success'
      );
      loadIntegrations();
    } catch (error) {
      console.error('Error toggling calendar status:', error);
      showToast('Failed to update calendar status', 'error');
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    setSyncing(integrationId);

    try {
      await supabase
        .schema('calendar')
        .from('calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
        })
        .eq('id', integrationId);

      showToast('Calendar synced successfully (demo)', 'success');
      loadIntegrations();
    } catch (error) {
      console.error('Error syncing calendar:', error);
      showToast('Failed to sync calendar', 'error');
    } finally {
      setSyncing(null);
    }
  };

  const formatSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const connectedProviders = integrations.map(i => i.provider);
  const availableProviders = Object.keys(providerInfo).filter(
    provider => !connectedProviders.includes(provider)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Calendar Integrations - ${resourceName}`}
      size="lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {integrations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Connected Calendars</h3>
                {integrations.map((integration) => {
                  const provider = providerInfo[integration.provider as keyof typeof providerInfo];
                  return (
                    <div
                      key={integration.id}
                      className={`border rounded-lg p-4 ${integration.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-75'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`${provider.bgColor} ${provider.color} p-2 rounded-lg`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{provider.name}</h4>
                            {integration.provider_account_email && (
                              <p className="text-xs text-gray-500">{integration.provider_account_email}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleActive(integration)}
                          className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${integration.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {integration.is_active ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Sync Direction:</span>
                          <span className="ml-2 font-medium text-gray-900 capitalize">
                            {integration.sync_direction.replace('-', ' ')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Sync:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {formatSyncTime(integration.last_sync_at)}
                          </span>
                        </div>
                      </div>

                      {integration.last_sync_status && (
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xs text-gray-500">Status:</span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${integration.last_sync_status === 'success'
                              ? 'bg-green-50 text-green-700'
                              : integration.last_sync_status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            {integration.last_sync_status}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleSyncNow(integration.id)}
                          disabled={syncing === integration.id || !integration.is_active}
                          className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === integration.id ? 'animate-spin' : ''}`} />
                          <span>{syncing === integration.id ? 'Syncing...' : 'Sync Now'}</span>
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {availableProviders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {integrations.length > 0 ? 'Add Another Calendar' : 'Connect a Calendar'}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {availableProviders.map((provider) => {
                    const info = providerInfo[provider as keyof typeof providerInfo];
                    return (
                      <button
                        key={provider}
                        onClick={() => handleConnectCalendar(provider)}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`${info.bgColor} ${info.color} p-2 rounded-lg`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{info.name}</div>
                            <div className="text-sm text-gray-500">{info.description}</div>
                          </div>
                        </div>
                        <LinkIcon className="w-5 h-5 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {integrations.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No calendars connected yet</p>
                <p className="text-sm text-gray-400">
                  Connect a calendar to automatically sync availability and prevent double bookings
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
