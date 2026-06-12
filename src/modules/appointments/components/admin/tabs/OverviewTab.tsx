import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, MapPin, TrendingUp, Loader2 } from 'lucide-react';

interface OverviewTabProps {
  organizationId: string | null;
}

interface Stats {
  totalResources: number;
  activeResources: number;
  eventTypes: number;
  locations: number;
  totalBookings: number;
  upcomingBookings: number;
}

export function OverviewTab({ organizationId }: OverviewTabProps) {
  const [stats, setStats] = useState<Stats>({
    totalResources: 0,
    activeResources: 0,
    eventTypes: 0,
    locations: 0,
    totalBookings: 0,
    upcomingBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    if (organizationId) {
      loadStats();
    }
  }, [organizationId]);

  async function loadStats() {
    if (!organizationId) return;

    try {
      setLoading(true);

      const { data: orgResponse } = await supabase
        .schema('core')
        .rpc('api_new_fetch_entity_records', {
          config: {
            entity_schema: 'identity',
            entity_name: 'organizations',
            filters: [{ key: 'id', operator: '=', value: organizationId }],
            pagination: { limit: 1 }
          }
        });

      const org = orgResponse?.data?.[0];
      if (org) setOrganizationName(org.name);

      const [resourcesResponse, eventTypesResponse, locationsResponse, bookingsResponse] = await Promise.all([
        supabase.schema('core').rpc('api_new_fetch_entity_records', {
          config: {
            entity_schema: 'cal',
            entity_name: 'v_bookable_resources',
            organization_id: organizationId,
            pagination: { limit: 1000 }
          }
        }),
        supabase.schema('core').rpc('api_new_fetch_entity_records', {
          config: {
            entity_schema: 'cal',
            entity_name: 'event_types',
            organization_id: organizationId,
            pagination: { limit: 1000 }
          }
        }),
        supabase.schema('core').rpc('api_new_fetch_entity_records', {
          config: {
            entity_schema: 'identity',
            entity_name: 'locations',
            organization_id: organizationId,
            pagination: { limit: 1000 }
          }
        }),
        supabase.schema('core').rpc('api_new_fetch_entity_records', {
          config: {
            entity_schema: 'cal',
            entity_name: 'v_bookings',
            filters: [{ key: 'scheduled_start', operator: '>=', value: new Date().toISOString() }],
            pagination: { limit: 1000 }
          }
        }),
      ]);

      const resList = resourcesResponse.data?.data || [];
      const etList = eventTypesResponse.data?.data || [];
      const locList = locationsResponse.data?.data || [];
      const bookList = bookingsResponse.data?.data || [];

      const activeResources = resList.filter((r: { is_active: boolean }) => r.is_active).length || 0;

      setStats({
        totalResources: resList.length,
        activeResources,
        eventTypes: etList.length,
        locations: locList.length,
        totalBookings: bookList.length,
        upcomingBookings: bookList.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an organization to view overview
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

  const statCards = [
    {
      label: 'Total Resources',
      value: stats.totalResources,
      subtext: `${stats.activeResources} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Event Types',
      value: stats.eventTypes,
      subtext: 'Configured',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Locations',
      value: stats.locations,
      subtext: 'Branches & facilities',
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Upcoming Bookings',
      value: stats.upcomingBookings,
      subtext: 'Scheduled',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{organizationName}</h2>
        <p className="text-gray-500 mt-1">Organization overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
                </div>
                <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:shadow-md transition-shadow text-sm font-medium text-gray-700">
              Add New Resource
            </button>
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:shadow-md transition-shadow text-sm font-medium text-gray-700">
              Create Event Type
            </button>
            <button className="w-full text-left px-4 py-3 bg-white rounded-lg hover:shadow-md transition-shadow text-sm font-medium text-gray-700">
              Configure Availability
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Resources Active</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${stats.totalResources > 0 ? (stats.activeResources / stats.totalResources) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats.totalResources > 0
                    ? Math.round((stats.activeResources / stats.totalResources) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Configuration</span>
              <span className="text-sm font-medium text-green-600">Complete</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Status</span>
              <span className="text-sm font-medium text-green-600">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
