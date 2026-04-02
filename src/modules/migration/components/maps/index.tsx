import React, { useState, useEffect } from 'react';
import { Layout, Spin, message, Typography, Badge } from 'antd';
import CustomerList from './CustomerList/CustomerList';
import CustomerMap from './CustomerMap/CustomerMap';
import AgentList from './AgentList/AgentList';
import type { Customer, AgentWithDetails, UserTrack } from './types';
import { supabase } from '@/core/lib/supabase';
import { MapPin, Users, Navigation } from 'lucide-react';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const MappingContainer: React.FC = () => {
  const [showTrackMap, setShowTrackMap] = useState<boolean>(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<AgentWithDetails[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [selectedAgent, setSelectedAgent] = useState<AgentWithDetails | undefined>();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'customers' | 'agents'>('customers');

  useEffect(() => {
    fetchInitialData();

    // Set up realtime subscriptions
    const accountsChannel = supabase
      .channel('crm_accounts_changes')
      .on('postgres_changes', { event: '*', schema: 'crm', table: 'accounts' }, () => fetchCustomers())
      .subscribe();

    const locationsChannel = supabase
      .channel('agent_locations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loc_agent_locations' }, () => fetchAgents())
      .subscribe();

    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(locationsChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCustomers(), fetchAgents()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // User specified crm.accounts
      const { data, error } = await supabase
        .schema('crm' as any)
        .from('accounts')
        .select('id, details, geofence')
        .eq('is_active', true);

      if (error) throw error;
      
      const mappedData = (data || []).map(item => {
        let name = 'Unnamed Account';
        if (item.details) {
          const detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
          name = detailsObj.name || name;
        }
        return { ...item, name };
      });
      
      setCustomers(mappedData);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      message.error(`Failed to load customers: ${err.message}`);
    }
  };

  const fetchAgents = async () => {
    try {
      // User specified public.loc_agent_locations joined with identity.users
      const { data, error } = await supabase
        .schema('core' as any) // Using core schema since loc_agent_locations might be there, or public
        .rpc('api_new_fetch_entity_records', {
          config: {
            main_table: { name: 'loc_agent_locations', schema: 'public' },
            join_table: { name: 'users', schema: 'identity', on_fk_column: 'user_id' },
            filters: { order_by: 'recorded_at DESC', limit: 500 }
          }
        });

      if (error) throw error;
      if (!data) return;

      // Filter latest location per agent
      const latest = data.reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id] || new Date(curr.recorded_at) > new Date(acc[curr.user_id].recorded_at)) {
          acc[curr.user_id] = {
            ...curr,
            user: curr.identityusers // Map joined data correctly
          };
        }
        return acc;
      }, {});

      // Build tracks
      const tracks: Record<string, UserTrack> = data.reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) {
          acc[curr.user_id] = { user: curr.identityusers, track: [], trackWithDates: [] };
        }
        acc[curr.user_id].track.push([curr.lat, curr.lng]);
        acc[curr.user_id].trackWithDates.push({ coordinates: [curr.lat, curr.lng], timestamp: curr.recorded_at });
        return acc;
      }, {});

      setUserData(tracks);
      setAgents(Object.values(latest));
    } catch (err: any) {
      console.error('Error fetching agents:', err);
      // Fallback to simpler query if RPC fails
      const { data, error } = await supabase
        .from('loc_agent_locations')
        .select(`*, user:users(*)`)
        .order('recorded_at', { ascending: false })
        .limit(100);
        
      if (!error && data) {
         setAgents(data as any);
      }
    }
  };

  const handleGeofenceUpdate = (id: string, wkt: string | null) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, geofence: wkt } : c));
    if (selectedCustomer?.id === id) {
      setSelectedCustomer(prev => prev ? { ...prev, geofence: wkt } : prev);
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Spin size="large" tip="Initializing Map..." /></div>;
  }

  return (
    <Layout className="h-screen bg-white overflow-hidden">
      <Content className="relative">
        <CustomerMap
          customers={customers}
          agents={agents}
          selectedCustomer={selectedCustomer}
          selectedAgent={selectedAgent}
          showAgents={activeTab === 'agents'}
          onGeofenceUpdate={handleGeofenceUpdate}
          showTrackMap={showTrackMap}
          setShowTrackMap={setShowTrackMap}
          userData={userData}
        />
      </Content>
      
      <Sider width={380} theme="light" className="border-l shadow-lg z-[1001]" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="p-4 border-b bg-gray-50">
          <Title level={4} className="m-0 flex items-center space-x-2">
            <MapPin size={22} className="text-blue-500" />
            <span>Field Management</span>
          </Title>
        </div>
        
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center space-x-2 ${activeTab === 'customers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 bg-gray-50'}`}
            onClick={() => setActiveTab('customers')}
          >
            <Navigation size={16} /> <span>Accounts</span>
            <Badge count={customers.length} size="small" className="ml-2" />
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center space-x-2 ${activeTab === 'agents' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 bg-gray-50'}`}
            onClick={() => setActiveTab('agents')}
          >
            <Users size={16} /> <span>Agents</span>
            <Badge count={agents.length} size="small" className="ml-2" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'customers' ? (
            <CustomerList
              customers={customers}
              selectedCustomerId={selectedCustomer?.id}
              onSelectCustomer={(c) => { setSelectedCustomer(c); setSelectedAgent(undefined); }}
            />
          ) : (
            <AgentList
              agents={agents}
              selectedAgentId={selectedAgent?.id}
              onSelectAgent={(a) => { setSelectedAgent(a); setShowTrackMap(true); }}
            />
          )}
        </div>
        
        {selectedCustomer && (
          <div className="p-4 bg-blue-50 border-t">
            <Text strong className="text-blue-800">Drawing Mode Active</Text>
            <p className="text-xs text-blue-600 m-0 mt-1">Use the tools on the map top-right to define a geofence for <strong>{selectedCustomer.name}</strong>.</p>
          </div>
        )}
      </Sider>
    </Layout>
  );
};

export default MappingContainer;
