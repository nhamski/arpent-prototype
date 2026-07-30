import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Arpent',
        short_name: 'Arpent',
        description: 'Consolidated ranch management — herd, land, and market in one app.',
        theme_color: '#241C14',
        background_color: '#241C14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/marsapi\.usda\.gov\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'usda-mars-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.weather\.gov\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'noaa-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 3 },
            },
          },
          {
            urlPattern: /^https:\/\/droughtmonitor\.unl\.edu\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'usdm-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/archive-api\.open-meteo\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'open-meteo-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.zippopotam\.us\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'geo-zip-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/geo\.fcc\.gov\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'geo-fcc-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
