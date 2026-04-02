import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load các biến môi trường từ file .env tương ứng với mode (dev hoặc demo)
  // Nếu không tìm thấy link trong file .env, nó sẽ mặc định dùng localhost:3000
  const env = loadEnv(mode, process.cwd());
  const API_TARGET = env.VITE_API_TARGET || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/uploads'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'media-assets-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-data-cache',
              },
            },
          ],
        },
        manifest: {
          name: 'Tour ẩm thực - GPS Tourism',
          short_name: 'FoodTour',
          description: 'Ứng dụng khám phá tour ẩm thực dựa trên GPS',
          theme_color: '#10b981',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/user',
          icons: [
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
          ]
        }
      })
    ],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      // Cho phép tất cả các host để không bao giờ bị lỗi "Blocked host" khi dùng tunnel
      allowedHosts: ['all'], 
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});