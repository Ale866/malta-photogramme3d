import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

function rewriteDevSetCookieHeader(value: string) {
  return value
    .replace(/;\s*Secure/giu, '')
    .replace(/;\s*Partitioned/giu, '')
    .replace(/;\s*SameSite=None/giu, '; SameSite=Lax')
}

function isAuthProxyResponse(url: string | undefined) {
  return typeof url === 'string' && /^\/auth(?:\/|$)/.test(url)
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devBackendUrl = (env.VITE_DEV_BACKEND_URL || '').trim() || 'http://localhost:3000'
  const useDevAuthProxy = env.VITE_USE_DEV_AUTH_PROXY === '1'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '^/(auth|upload|model|model-jobs)(?:/|$)': {
          target: devBackendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              if (!useDevAuthProxy) return
              if (!isAuthProxyResponse(req.url)) return

              const setCookie = proxyRes.headers['set-cookie']
              if (!setCookie) return

              const normalizedSetCookie = Array.isArray(setCookie) ? setCookie : [setCookie]
              proxyRes.headers['set-cookie'] = normalizedSetCookie.map(rewriteDevSetCookieHeader)
            })
          },
        },
      },
    },
  }
})
