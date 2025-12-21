import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

const baseTokens = {
  borderRadius: 10,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

// Common component styles that adapt to theme
const getCommonComponentStyles = (isDark: boolean) => ({
  Layout: {
    headerBg: 'transparent', // Header background remains transparent for the overall layout gradient/color
    headerPadding: '0 24px',


// --- START: Sidebar background changes without contrast ---
  //   siderBg: isDark ? '#161B22' : '#f8f8f8', // Distinct sidebar background color
  //   bodyBg: 'transparent',
  // },
  // Menu: {
  //   itemBg: 'transparent',
  // --- START: Menu item color adjustments based on sidebar background ---
  //   itemSelectedBg: isDark ? 'rgba(64, 196, 255, 0.2)' : '#e0f7fa', // Slightly deeper/lighter selected bg
  //   itemHoverBg: isDark ? 'rgba(64, 196, 255, 0.1)' : '#e1f5fe', // Lighter hover bg
  //   itemActiveBg: isDark ? 'rgba(64, 196, 255, 0.3)' : '#b3e5fc', // More pronounced active bg
  //   itemColor: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
  //   itemHoverColor: isDark ? '#40c4ff' : '#0288d1', // Deeper blue on hover for light theme
  //   itemSelectedColor: isDark ? '#40c4ff' : '#0288d1', // Deeper blue for selected text in light theme
  // --- END: Menu item color adjustments ---


    // --- START: Sidebar background changes for contrast ---
    // siderBg: isDark ? '#1F2937' : '#1A232E', // Dark theme: lighter grey sidebar; Light theme: dark grey sidebar
    // siderBg: isDark ? '#212121e0' : '#3e6193', 
    siderBg: isDark ? '#1a232e' :  '#3e6193',
    // bodyBg: 'transparent',

    // siderBg: isDark ? '#1F2937' : '#1A232E', // Dark theme: lighter grey sidebar; Light theme: dark grey sidebar
    bodyBg: 'transparent', // Allow the global body gradient to show through the Layout's content area
  },
  Menu: {
    itemBg: 'transparent',
    // --- START: Menu item color adjustments based on sidebar background ---
    itemSelectedBg: isDark ? 'rgba(64, 196, 255, 0.2)' : 'rgba(64, 196, 255, 0.2)', // Consistent blue selection highlight
    itemHoverBg: isDark ? 'rgba(64, 196, 255, 0.1)' : 'rgba(64, 196, 255, 0.1)', // Consistent blue hover highlight
    itemActiveBg: isDark ? 'rgba(64, 196, 255, 0.3)' : 'rgba(64, 196, 255, 0.3)', // Consistent blue active highlight
    itemColor: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.85)', // Light text for dark sidebar in light theme, and for dark theme
    itemHoverColor: '#40c4ff', // Primary blue for hover
    itemSelectedColor: '#40c4ff', // Primary blue for selected text
    // --- END: Menu item color adjustments ---
    // --- END: Sidebar background changes for contrast ---
  },
  Card: {
    headerBg: 'transparent',
    colorBgContainer: isDark ? '#1A232E' : '#ffffff', // Slightly different shade for dark cards
    colorBorderSecondary: isDark ? '#37474F' : '#e0e0e0', // Consistent border for cards
    boxShadow: isDark 
      ? '0 4px 12px rgba(0, 0, 0, 0.2)' // Softer shadow for dark theme
      : '0 4px 12px rgba(0, 0, 0, 0.05)', // Softer shadow for light theme, removed inset
  },
  Button: {
    defaultBg: isDark ? '#2A3340' : '#ffffff', // Darker grey for secondary buttons in dark, white for light
    defaultColor: isDark ? '#e0e0e0' : 'rgba(0, 0, 0, 0.85)', // Light text for dark secondary, dark for light
    defaultBorderColor: isDark ? '#4A5568' : '#d0d0d0', // More defined border for secondary buttons
    borderRadius: 10,
    paddingInline: 24,
  },
  Input: {
    colorBgContainer: isDark ? '#1A232E' : '#ffffff', // Consistent with card background
    colorBorder: isDark ? '#4A5568' : '#d0d0d0', // More defined border
    borderRadius: 4,
  },
  Select: {
    colorBgContainer: isDark ? '#1A232E' : '#ffffff', // Consistent with card background
    colorBorder: isDark ? '#4A5568' : '#d0d0d0', // More defined border
    borderRadius: 4,
  },
  Table: {
    headerBg: isDark ? '#1F2937' : '#f7f9fa', // Slightly distinct header background
    headerColor: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    rowHoverBg: isDark ? 'rgba(64, 196, 255, 0.1)' : 'rgba(64, 196, 255, 0.05)',
    borderColor: isDark ? '#37474F' : '#e0e0e0', // Consistent border for tables
    borderRadius: 10,
  },
  Tabs: { // New Ant Design Tabs component styling
    colorBgContainer: 'transparent', // Tab bar background is transparent
    inkBarColor: isDark ? '#4fc3f7' : '#40c4ff', // Active tab indicator color (primary blue)
    itemColor: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)', // Inactive tab text color
    itemSelectedColor: isDark ? '#4fc3f7' : '#40c4ff', // Selected tab text color (primary blue)
    itemActiveBg: 'transparent', // Active tab item background (no fill)
    itemHoverBg: isDark ? 'rgba(64, 196, 255, 0.05)' : 'rgba(64, 196, 255, 0.02)', // Subtle hover background
    borderRadius: 1, // Apply 1px border radius to tab items
  },
});

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...baseTokens,
    colorPrimary: '#40c4ff', // Main accent blue
    colorInfo: '#40c4ff',
    colorSuccess: '#4caf50',
    colorWarning: '#ff9800',
    colorError: '#f44336',
    colorTextBase: '#212121', // Dark text
    colorBgBase: 'transparent',
    // colorBgBase: '#f1f9ff',
    // colorBgBase: '#e3f2fd', // Light blue background
    colorBgContainer: '#ffffff', // White for cards, inputs, etc.
    colorBgElevated: '#ffffff',
    // colorBgLayout: '#e3f2fd',
    // --- START: Layout background made transparent for light theme ---
    colorBgLayout: 'transparent', // Allow the global body gradient to show through
    // --- END: Layout background made transparent for light theme ---
    colorBgSpotlight: '#bbdefb',
    colorBorder: '#d0d0d0', // Slightly darker general border
    colorBorderSecondary: '#e0e0e0', // Lighter secondary border
  },
  components: getCommonComponentStyles(false),
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...baseTokens,
    colorPrimary: '#4fc3f7', // Slightly desaturated blue for dark theme
    colorInfo: '#4fc3f7',
    colorSuccess: '#43a047',
    colorWarning: '#fb8c00',
    colorError: '#e53935',
    colorTextBase: '#e0e0e0', // Light grey text
    colorBgBase: '#0d1a26', // Very dark blue-grey background
    colorBgContainer: '#1A232E', // Slightly lighter dark grey for cards, inputs, etc.
    colorBgElevated: '#1A232E',
    // colorBgLayout: '#0d1a26',
    // --- START: Layout background made transparent for dark theme ---
    colorBgLayout: 'transparent', // Allow the global body gradient to show through
    // --- END: Layout background made transparent for dark theme ---
    colorBgSpotlight: '#37474f',
    colorBorder: '#4A5568', // More defined border for dark theme
    colorBorderSecondary: '#37474f', // Lighter secondary border for dark theme
  },
  components: getCommonComponentStyles(true),
};
