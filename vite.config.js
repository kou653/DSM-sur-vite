import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'Fichier 3.png'],
      manifest: {
        name: 'DSM Dashboard',
        short_name: 'DSM',
        description: 'Plateforme de monitoring environnemental.',
        theme_color: '#149655',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/Fichier 3.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // devOptions: {
      //   enabled: true,
      //   type: 'module',
      // }
    })
  ],
})

