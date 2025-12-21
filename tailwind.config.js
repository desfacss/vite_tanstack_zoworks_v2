// /** @type {import('tailwindcss').Config} */
// export default {
//   content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
//   theme: {
//     extend: {
//       colors: {
//         blue: {
//           50: '#e6f7ff',
//           100: '#bae7ff',
//           200: '#91d5ff',
//           300: '#69c0ff',
//           400: '#40a9ff',
//           500: '#1890ff',
//           600: '#096dd9',
//           700: '#0050b3',
//           800: '#003a8c',
//           900: '#002766',
//         },
//         copper: {
//           50: '#fff1e6',
//           100: '#ffd9b3',
//           200: '#d4976a',
//           300: '#b37c50',
//           400: '#996543',
//           500: '#804d36',
//           600: '#663929',
//           700: '#4d2b1f',
//           800: '#331d15',
//           900: '#1a0f0a',
//         },
//       },
//     },
//   },
//   plugins: [],
// };


/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark': 'var(--color-primary-dark)',
        background: 'var(--color-background)',
        'background-secondary': 'var(--color-background-secondary)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionProperty: {
        'size': 'width, height',
        'spacing': 'margin, padding',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};