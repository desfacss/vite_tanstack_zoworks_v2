// src/pages/core/Profile/components/EditLocationsModal.tsx
/**
 * Edit Locations Modal
 * Allows users to select their primary location
 */
import React, { useEffect, useState } from 'react';
import { Modal, Radio, Spin, Empty, Space } from 'antd';
import { MapPin } from 'lucide-react';
import { useFetchAvailableLocations, useUpdateLocation } from '@/core/hooks/useProfileMutations';

interface Location {
  id: string;
  name: string;
  is_active?: boolean;
}

interface EditLocationsModalProps {
  open: boolean;
  onClose: () => void;
  currentLocationId?: string;
}

export const EditLocationsModal: React.FC<EditLocationsModalProps> = ({
  open,
  onClose,
  currentLocationId,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(currentLocationId);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

  const fetchLocations = useFetchAvailableLocations();
  const updateLocation = useUpdateLocation();

  // Initialize selected location from current location
  useEffect(() => {
    if (open) {
      setSelectedLocationId(currentLocationId);
      fetchLocations.mutate(undefined, {
        onSuccess: (data) => setAvailableLocations(data),
      });
    }
  }, [open, currentLocationId]);

  const handleSave = () => {
    if (!selectedLocationId) return;

    updateLocation.mutate(
      { locationId: selectedLocationId },
      { onSuccess: () => onClose() }
    );
  };

  const isLoading = fetchLocations.isPending;
  const isSaving = updateLocation.isPending;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-orange-500" />
          <span>Edit Primary Location</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Changes"
      okButtonProps={{ loading: isSaving, disabled: isLoading || !selectedLocationId }}
      cancelButtonProps={{ disabled: isSaving }}
      destroyOnClose
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : availableLocations.length === 0 ? (
        <Empty description="No locations available" />
      ) : (
        <Radio.Group
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full"
        >
          <Space direction="vertical" className="w-full">
            {availableLocations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center p-3 rounded-lg bg-fill-quaternary hover:bg-fill-tertiary transition-colors w-full"
              >
                <Radio value={loc.id}>
                  <span className="font-medium">{loc.name}</span>
                </Radio>
              </div>
            ))}
          </Space>
        </Radio.Group>
      )}
    </Modal>
  );
};

export default EditLocationsModal;
