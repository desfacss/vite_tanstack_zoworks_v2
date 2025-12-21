export {};

declare global {
  interface Window {
    deviceType: () => 'mobile' | 'tablet' | 'desktop';
    deviceOS: () => 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other';
    isMobile: () => boolean;
    isTablet: () => boolean;
    isDesktop: () => boolean;
    isIOS: () => boolean;
    isAndroid: () => boolean;
  }
}
