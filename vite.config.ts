import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import path from 'path';

// Derive __dirname for ES modules
const __dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));


export default defineConfig({

  resolve: {
    alias: {
      '@/views': path.resolve(__dirname, './src/views'),
      '@': path.resolve(__dirname, 'src'),
      "antd/lib": "antd/es", // Add the alias here
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
    },
  },
  base: '/', // This is often the fix for Vercel if your app is at the root
  define: {
    'process.env': {}, // Shim process.env to an empty object
  },
  // server: {
  //     proxy: {
  //       '/api/supabase': {
  //         target: 'https://gbhktobgplalpjmfoyte.supabase.co',
  //         changeOrigin: true,
  //         rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
  //         secure: true,
  //       },
  //     },
  //   },
  plugins: [
    react(),
    VitePWA({
      // registerType: 'autoUpdate',
      // strategies: 'generateSW',
      registerType: 'prompt', // 'prompt' is generally better for PWAs with notifications
      strategies: 'injectManifest',
      srcDir: 'src', // Your service worker file is in src
      filename: 'sw.ts', // Specify your service worker filename
      // registerType: 'prompt',
      // strategies: 'injectManifest',
      // srcDir: 'src',
      // filename: 'sw.ts',
      devOptions: {
        // enabled: true,
        enabled: false, // Temporarily disable for auth debugging
        type: 'module',
      },
      manifest: {
        name: 'Enterprise App',
        short_name: 'Enterprise',
        description: 'Enterprise Application Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-icon-180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshot-1.png',
            sizes: '1170x2532',
            type: 'image/png',
            platform: 'narrow',
            label: 'Enterprise App on iPhone'
          },
          {
            src: '/screenshot-2.png',
            sizes: '1284x2778',
            type: 'image/png',
            platform: 'wide',
            label: 'Enterprise App on iPad'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            url: '/dashboard',
            icons: [{ src: '/dashboard-icon.png', sizes: '96x96', type: 'image/png' }]
          }
        ],
        related_applications: [],
        prefer_related_applications: false
      },
      workbox: {
        // globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        runtimeCaching: [
          // {
          //   urlPattern: /^https:\/\/kxpeuyomuohexsvcxneu\.supabase\.co\/.*/i,
          //   handler: 'NetworkFirst',
          //   options: {
          //     cacheName: 'supabase-api-cache',
          //     networkTimeoutSeconds: 10,
          //     expiration: {
          //       maxEntries: 100,
          //       maxAgeSeconds: 60 * 60 * 24
          //     },
          //     cacheableResponse: {
          //       statuses: [0, 200]
          //     }
          //   }
          // },
          {
            urlPattern: /^https:\/\/kxpeuyomuohexsvcxneu\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 30, // Increased from 10s
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|ico|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      },
      // devOptions: {
      //   enabled: true,
      //   type: 'module'
      // }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react', 'react-calendar-timeline']
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['antd', '@ant-design/icons'],
          form: ['@rjsf/antd', '@rjsf/core', '@rjsf/utils', '@rjsf/validator-ajv8'],
          state: ['@tanstack/react-query', 'zustand'],
          animation: ['framer-motion']
        }
      }
    }
  },
  esbuild: {
    // Apply 'jsx' loader to .js files that contain JSX
    // loader: {
    //   '.js': 'jsx',
    // },
    // If you want to transform all .js files, or specific ones:
    // include: /src\/components\/pages\/(ProcessEditor)\/.*\.js$/, // More specific
    // jsxFactory: 'React.createElement', // If you're not using the new JSX transform (React 17+)
    // jsxFragment: 'React.Fragment',
  },
});