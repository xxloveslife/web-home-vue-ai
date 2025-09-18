import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: false
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})


