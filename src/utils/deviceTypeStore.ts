import { useEffect, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OS = 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other';

const subscribers: ((deviceType: DeviceType) => void)[] = [];
let currentDeviceType: DeviceType = detectDeviceType();
const currentOS: OS = detectOS();

function detectDeviceType(): DeviceType {
  const width = window.innerWidth;
  const ua = navigator.userAgent.toLowerCase();

  const isMobileUA = /iphone|android.*mobile|windows phone|blackberry/.test(ua);
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/.test(ua);

  // Viewport width takes priority for responsive design
  // If width is clearly desktop-sized, treat as desktop regardless of UA
  if (width >= 1024) return 'desktop';
  if (width < 768) return 'mobile';

  // For tablet range (768-1024), use UA hint if available
  if (isTabletUA) return 'tablet';
  if (isMobileUA) return 'mobile';

  return 'tablet'; // Default for 768-1024 range
}

function detectOS(): OS {
  const platform = navigator.platform.toLowerCase();
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  if (/android/.test(ua)) return 'Android';
  if (/win/.test(platform)) return 'Windows';
  if (/mac/.test(platform)) return 'macOS';
  if (/linux/.test(platform)) return 'Linux';

  return 'Other';
}

function notifySubscribers(newType: DeviceType) {
  for (const sub of subscribers) {
    sub(newType);
  }
}

function handleResize() {
  const newType = detectDeviceType();
  if (newType !== currentDeviceType) {
    currentDeviceType = newType;
    notifySubscribers(currentDeviceType);
  }
}

// Attach global resize handler
window.addEventListener('resize', handleResize);

// Add global access
window.deviceType = () => currentDeviceType;
window.isMobile = () => currentDeviceType === 'mobile';
window.isTablet = () => currentDeviceType === 'tablet';
window.isDesktop = () => currentDeviceType === 'desktop';
window.deviceOS = () => currentOS;
window.isIOS = () => currentOS === 'iOS';
window.isAndroid = () => currentOS === 'Android';

export function useDeviceType(): DeviceType {
  const [type, setType] = useState(currentDeviceType);

  useEffect(() => {
    subscribers.push(setType);
    return () => {
      const index = subscribers.indexOf(setType);
      if (index !== -1) subscribers.splice(index, 1);
    };
  }, []);

  return type;
}

export function useDeviceOS(): OS {
  return currentOS;
}
