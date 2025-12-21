// src/components/Layout/GlobalLoader.tsx
import { useAuthStore } from '@/core/lib/store';
import { Spin } from 'antd';

export const GlobalLoader = () => {
  const isSwitchingOrg = useAuthStore((state) => state.isSwitchingOrg);

  if (!isSwitchingOrg) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      <Spin size="large" />
    </div>
  );
};
