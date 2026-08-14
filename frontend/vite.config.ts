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
        '/static': 'http://localhost:8000',
        // 发布页与应用同源：/{user}/{page} 代理到后端，使发布页上的互动组件能读到
        // 与主应用相同的 localStorage JWT。Vite 支持 key 以 `^` 开头的正则代理。
        // 限定 user_id/page_id 字符集（均不含点）——避免命中 Vite 源码模块路径
        // （如 /src/main.tsx、/@vite/client），那些必须留给 Vite 自己 serve。
        '^\\/(?!admin|api|static)[a-zA-Z0-9_-]{3,30}\\/[a-zA-Z0-9_-]{1,50}$': 'http://localhost:8000',
      },
    },
  }
})
