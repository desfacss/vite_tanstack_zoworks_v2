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
        // AI-specific colors from adaptive-ai-crm
        accent: {
          DEFAULT: 'hsl(190 95% 50%)',
          foreground: 'hsl(222 47% 11%)',
          glow: 'hsl(190 100% 60%)',
        },
        stage: {
          lead: 'hsl(280 65% 60%)',
          qualified: 'hsl(214 100% 50%)',
          proposal: 'hsl(38 92% 50%)',
          negotiation: 'hsl(24 95% 53%)',
          won: 'hsl(142 76% 36%)',
          lost: 'hsl(0 65% 50%)',
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
      // Enhanced box shadows from adaptive-ai-crm
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'ai': '0 0 20px hsl(190 100% 60% / 0.3)',
        'premium': '0 10px 40px rgba(0, 0, 0, 0.1)',
        'premium-lg': '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      // Background gradients from adaptive-ai-crm
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(214 100% 50%), hsl(214 100% 60%))',
        'gradient-ai': 'linear-gradient(135deg, hsl(190 95% 50%), hsl(210 100% 60%))',
        'gradient-header': 'linear-gradient(90deg, hsl(214 100% 50%), hsl(230 100% 60%))',
        'gradient-card': 'linear-gradient(180deg, hsl(0 0% 100%), hsl(220 20% 98%))',
      },
      // Enhanced keyframes and animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(100%)', opacity: '0' },
        },
        'slide-in-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.3s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-glow': 'pulse-glow 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      // Support for backdrop filter (glass morphism)
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
  // Disable Tailwind's preflight to avoid conflicts with Ant Design
  corePlugins: {
    preflight: false,
    // Enable backdrop filter for glass morphism
    backdropFilter: true,
  },
}