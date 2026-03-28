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
        name: 'GPS Tourism App',
        short_name: 'GPSTour',
        description: 'Bản đồ du lịch tương tác đa ngôn ngữ',
        theme_color: '#10b981', // Màu emerald cho chuyên nghiệp
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/app',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          // Lưu ý: Để hiện nút "Install" trên Android, bạn nên có thêm 1 file .png 512x512 trong thư mục public
        ]
      }
    })
  ],
server: {
    // Cho phép tất cả các host từ ngrok truy cập
    allowedHosts: [
      'unbribable-jettingly-winifred.ngrok-free.dev', 
      '.ngrok-free.dev', // Cho phép tất cả subdomain của ngrok
      'all'
    ],
    host: true, 
    port: 5173,
    strictPort: true, // Giữ cố định cổng 5173
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }});