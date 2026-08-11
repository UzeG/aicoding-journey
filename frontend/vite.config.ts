import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isMock = env.VITE_MOCK_LLM === 'true'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/generate': isMock
          ? {
              target: 'http://localhost:8000',
              rewrite: () => '/api/mock/generate',
            }
          : 'http://localhost:8000',
        '/api': 'http://localhost:8000',
        '/p': 'http://localhost:8000',
      },
    },
  }
})
