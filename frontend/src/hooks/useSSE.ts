import { generateSSE } from '../api/endpoints'
import { useGenerationStore } from '../stores/generation'
import { useProgressStore } from '../stores/progress'
import { useAuthStore } from '../stores/auth'
import { SLATE_THEME } from '../lib/theme'

export function useSSE() {
  const store = useGenerationStore()

  const startGeneration = async (prompt: string, existingPageId?: string | null) => {
    // Capture current pageId + accentColor before startStreaming resets the pageId
    const pageId = existingPageId ?? useGenerationStore.getState().pageId
    // 未显式选主色调 → 默认系统主题配色（登录用户主题色，未设置则平台默认石板蓝）
    const picked = useGenerationStore.getState().accentColor
    const userTheme = useAuthStore.getState().user?.theme
    const accentColor = picked || userTheme || SLATE_THEME.hex
    store.startStreaming(prompt)
    useProgressStore.getState().start() // 顶部加载进度条

    const abortController = new AbortController()

    try {
      const response = await generateSSE(prompt, pageId, accentColor, abortController.signal)

      if (!response.ok) {
        const data = await response.json()
        store.setError(data.detail || 'Generation failed')
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'progress') {
              store.setProgress(event.step, event.message)
            } else if (event.type === 'token') {
              store.appendCode(event.content)
            } else if (event.type === 'final') {
              store.setCode(event.content)
            } else if (event.type === 'done') {
              store.finishStreaming(event.page_id, event.title || '', event.tags || [])
            } else if (event.type === 'error') {
              store.setError(event.message)
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        store.setError(err.message || 'Network error')
      }
    }

    useProgressStore.getState().done() // 生成结束/出错/停止
    return abortController
  }

  return { startGeneration, abortController: new AbortController() }
}
