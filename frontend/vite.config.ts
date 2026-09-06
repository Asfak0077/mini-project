import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true as any,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5001',
          changeOrigin: true
        },
        '/socket.io': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5001',
          ws: true,
          changeOrigin: true
        },
        '/uploads': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5001',
          changeOrigin: true
        }
      }
    },
    define: {
      'import.meta.env.VITE_VERCEL': JSON.stringify(env.VITE_VERCEL || 'false'),
      'import.meta.env.PROD': JSON.stringify(mode === 'production'),
    }
  }
})
