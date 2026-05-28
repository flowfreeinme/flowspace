import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

const isElectron = process.env.ELECTRON === 'true'

export default defineConfig({
  plugins: [
    react(),
    ...(isElectron
      ? [
          electron({
            main: { entry: 'electron/main.ts' },
            preload: { input: 'electron/preload.ts' },
            renderer: {},
          }),
        ]
      : []),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  base: isElectron ? './' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          storage: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/.Trash/**', '**/.git/**', '**/node_modules/**'],
    },
  },
})
