// src/pages/core/Profile/components/LocationsSection.tsx
/**
 * Locations Section Component
 * Displays accessible locations with edit capability
 */
import React, { useState } from 'react';
import { Card, Typography, Tag, Empty, Button } from 'antd';
import { MapPin, Building, Pencil } from 'lucide-react';
import { Location } from '@/core/lib/types';
import EditLocationsModal from './EditLocationsModal';

const { Text, Title } = Typography;

interface LocationsSectionProps {
  locations?: Location[] | { id: string; name: string }[];
  currentLocationId?: string;
}

export const LocationsSection: React.FC<LocationsSectionProps> = ({
  locations = [],
  currentLocationId,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const hasLocations = locations.length > 0;

  return (
    <>
      <Card className="profile-locations-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <MapPin size={20} className="text-orange-500" />
            </div>
            <div>
              <Title level={5} className="!mb-0">
                Locations
              </Title>
              <Text type="secondary" className="text-xs">
                Accessible work locations
              </Text>
            </div>
          </div>
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => setIsEditModalOpen(true)}
            className="text-text-secondary hover:text-primary"
          />
        </div>

        {!hasLocations ? (
          <Empty description="No locations assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => (
              <Tag
                key={loc.id}
                color={loc.id === currentLocationId ? 'blue' : 'orange'}
                className="px-3 py-1.5 text-sm"
              >
                <Building size={12} className="inline mr-1.5" />
                {loc.name}
                {loc.id === currentLocationId && (
                  <span className="ml-1 text-xs opacity-75">(Current)</span>
                )}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <EditLocationsModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentLocationId={currentLocationId}
      />
    </>
  );
};

export default LocationsSection;
