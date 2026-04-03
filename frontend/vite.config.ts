import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devBackendUrl = (env.VITE_DEV_BACKEND_URL || '').trim() || 'http://localhost:3000'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/auth': {
          target: devBackendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/upload': {
          target: devBackendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/model': {
          target: devBackendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/model-jobs': {
          target: devBackendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: devBackendUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
