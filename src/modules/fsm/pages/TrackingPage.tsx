import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Layout, Spin, message, List, Card, Typography, Avatar } from 'antd';
import CustomerMap from '../components/Map/CustomerMap';
import { supabase } from '@/core/lib/supabase';
import type { Customer, AgentWithDetails } from '../types';

const { Content, Sider } = Layout;

export default function TrackingPage() {
  const [showTrackMap, setShowTrackMap] = useState<boolean>(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<AgentWithDetails[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [selectedAgent, setSelectedAgent] = useState<AgentWithDetails | undefined>();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>({});

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const accountsChannel = supabase
      .channel('accounts')
      .on('postgres_changes', { event: '*', schema: 'external', table: 'accounts' }, () => fetchCustomers())
      .subscribe();

    const locationsChannel = supabase
      .channel('agent_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loc_agent_locations' }, () => fetchAgents())
      .subscribe();

    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(locationsChannel);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchCustomers(), fetchAgents()]);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.rpc('maps_get_clients_with_wkt');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      message.error('Failed to load customers');
    }
  };

  const fetchAgents = async () => {
    try {
      // In Bolt, this used loc_agent_locations joined with identity.users
      const { data, error } = await supabase.schema('core').rpc('core_get_entity_data_v30', {
        config: {
          main_table: { name: 'loc_agent_locations', schema: 'public' },
          join_table: { name: 'users', schema: 'identity', on_fk_column: 'user_id' },
          filters: { order_by: 'recorded_at DESC', limit: 1000 },
        },
      });

      if (error) throw error;
      
      const latestLocations = (data || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id] || new Date(curr.recorded_at) > new Date(acc[curr.user_id].recorded_at)) {
          acc[curr.user_id] = curr;
        }
        return acc;
      }, {});

      const tracksByUser = (data || []).reduce((acc: any, curr: any) => {
        const { user_id, lat, lng, recorded_at, publicusers } = curr;
        if (!acc[user_id]) acc[user_id] = { user: publicusers, track: [], trackWithDates: [] };
        acc[user_id].track.push([lat, lng]);
        acc[user_id].trackWithDates.push({ coordinates: [lat, lng], timestamp: recorded_at });
        return acc;
      }, {});

      setUserData(tracksByUser);
      setAgents(Object.values(latestLocations));
    } catch (error: any) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleGeofenceUpdate = (customerId: string, geofence: string | null) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, geofence } : c));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(prev => prev ? { ...prev, geofence } : prev);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Spin size="large" /></div>;
  }

  return (
    <Layout className="h-full">
      <Content className="relative">
        <CustomerMap
          customers={customers}
          agents={agents}
          selectedCustomer={selectedCustomer}
          selectedAgent={selectedAgent}
          showAgents={true}
          onGeofenceUpdate={handleGeofenceUpdate}
          showTrackMap={showTrackMap}
          setShowTrackMap={setShowTrackMap}
          userData={userData}
        />
      </Content>
      <Sider width={320} theme="light" className="border-l overflow-y-auto">
        <div className="p-4 border-b">
          <Typography.Title level={5} className="m-0">Operations Control</Typography.Title>
        </div>
        <Card title="Live Agents" size="small" className="m-2 shadow-sm">
           <List
             itemLayout="horizontal"
             dataSource={agents}
             renderItem={agent => (
               <List.Item 
                 className={`cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors ${selectedAgent?.id === agent.id ? 'bg-blue-50' : ''}`}
                 onClick={() => {
                   setSelectedAgent(agent);
                   setShowTrackMap(true);
                 }}
               >
                 <List.Item.Meta
                   avatar={<Avatar>{agent.user?.name?.[0]}</Avatar>}
                   title={agent.user?.name}
                   description={`Last seen: ${dayjs(agent.recorded_at).fromNow()}`}
                 />
               </List.Item>
             )}
           />
        </Card>
        <Card title="Customers" size="small" className="m-2 shadow-sm">
           <List
             size="small"
             dataSource={customers}
             renderItem={customer => (
               <List.Item
                 className={`cursor-pointer hover:bg-gray-100 p-2 rounded ${selectedCustomer?.id === customer.id ? 'bg-blue-100 border-blue-200' : ''}`}
                 onClick={() => setSelectedCustomer(customer)}
               >
                 {customer.name}
               </List.Item>
             )}
           />
        </Card>
      </Sider>
    </Layout>
  );
}
