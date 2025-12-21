/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Use .dark class for dark mode
  theme: {
    // Override default screens to match Ant Design Grid breakpoints
    screens: {
      'xs': '0px',      // Extra small (all devices)
      'sm': '576px',    // Small devices (landscape phones)
      'md': '768px',    // Medium devices (tablets)
      'lg': '992px',    // Large devices (desktops)
      'xl': '1200px',   // Extra large devices
      '2xl': '1600px',  // Extra extra large
    },
    extend: {
      colors: {
        // Use CSS variables for theme-aware colors
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',

        // WhatsApp branding colors
        primary: {
          DEFAULT: '#1890ff',
          50: '#e6f7ff',
          100: '#bae7ff',
          200: '#91d5ff',
          300: '#69c0ff',
          400: '#40a9ff',
          500: '#1890ff',
          600: '#096dd9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766',
        },
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
        whatsapp: {
          DEFAULT: '#25D366',
          light: '#dcf8c6',
          dark: '#075E54',
          teal: 'var(--color-whatsapp-teal)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        // Safe area insets for PWA
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px', // Minimum touch target
      },
      minWidth: {
        'touch': '44px', // Minimum touch target
      },
    },
  },
  plugins: [],
  // Disable Tailwind's preflight to avoid conflicts with Ant Design
  corePlugins: {
    preflight: false,
  },
}