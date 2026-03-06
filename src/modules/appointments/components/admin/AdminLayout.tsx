import React, { useState } from 'react';
import { Building2, Users, Calendar, MapPin, Settings, BarChart3 } from 'lucide-react';
import { SeedDataButton } from './SeedDataButton';
import { OverviewTab } from './tabs/OverviewTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { EventTypesTab } from './tabs/EventTypesTab';
import { LocationsTab } from './tabs/LocationsTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { SettingsTab } from './tabs/SettingsTab';

type TabType = 'overview' | 'resources' | 'events' | 'locations' | 'analytics' | 'settings';

interface AdminLayoutProps {
  organizationId: string | null;
}

export default function AdminLayout({ organizationId }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Building2 },
    { id: 'resources' as TabType, label: 'Resources', icon: Users },
    { id: 'events' as TabType, label: 'Event Types', icon: Calendar },
    { id: 'locations' as TabType, label: 'Locations', icon: MapPin },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 m-8">
        <Building2 className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No Organization Selected</h3>
        <p className="text-gray-500">Please select an organization from the header to manage it.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden border border-gray-100">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-8 py-5 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 min-h-[600px]">
        {activeTab === 'overview' && <OverviewTab organizationId={organizationId} />}
        {activeTab === 'resources' && <ResourcesTab organizationId={organizationId} />}
        {activeTab === 'events' && <EventTypesTab organizationId={organizationId} />}
        {activeTab === 'locations' && <LocationsTab organizationId={organizationId} />}
        {activeTab === 'analytics' && <AnalyticsTab organizationId={organizationId} />}
        {activeTab === 'settings' && <SettingsTab organizationId={organizationId} />}
      </div>

      <SeedDataButton />
    </div>
  );
}
