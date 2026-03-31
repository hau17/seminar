import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Cache các file tĩnh trong thư mục dist
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        // Cấu hình quan trọng để lưu Audio và Ảnh từ Backend (cổng 3000)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads'),
            handler: 'CacheFirst', // Ưu tiên lấy từ bộ nhớ đệm trước
            options: {
              cacheName: 'media-assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // Lưu trong 30 ngày
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst', // Ưu tiên mạng, nếu mất mạng thì lấy bản cũ trong cache
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
// ... các phần plugins giữ nguyên

server: {
    host: 'localhost', 
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Trỏ về localhost thay vì IP
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
}
});