import React from 'react';
import { List, Card, Typography, Tooltip } from 'antd';
import type { Customer } from '../types';
import { MapPin } from 'lucide-react';

const { Text } = Typography;

interface CustomerListProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Customer) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}) => {
  return (
    <List
      dataSource={customers}
      renderItem={(customer) => (
        <List.Item
          onClick={() => onSelectCustomer(customer)}
          style={{
            cursor: 'pointer',
            padding: '12px',
            borderBottom: '1px solid #f0f0f0',
            transition: 'all 0.3s ease',
          }}
        >
          <Card 
            size="small" 
            className="w-full"
            hoverable
            style={{
              borderColor: selectedCustomerId === customer.id ? '#1890ff' : '#f0f0f0',
              boxShadow: selectedCustomerId === customer.id ? '0 4px 12px rgba(24, 144, 255, 0.15)' : 'none',
              borderRadius: '8px',
              backgroundColor: selectedCustomerId === customer.id ? '#f0faff' : '#ffffff',
            }}
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <Text strong className="text-sm truncate flex-1">
                  {customer.name || 'Unnamed Account'}
                </Text>
                {customer.geofence ? (
                  <Tooltip title="Geofence Defined">
                    <MapPin size={14} className="text-blue-500" />
                  </Tooltip>
                ) : (
                  <Tooltip title="No Geofence Set">
                    <MapPin size={14} className="text-gray-300" />
                  </Tooltip>
                )}
              </div>
              {customer.details?.address && (
                <Text type="secondary" className="text-xs truncate mt-1">
                  {customer.details.address}
                </Text>
              )}
            </div>
          </Card>
        </List.Item>
      )}
    />
  );
};

export default CustomerList;
