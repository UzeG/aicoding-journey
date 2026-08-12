import { generateSSE } from '../api/endpoints'
import { useGenerationStore } from '../stores/generation'

export function useSSE() {
  const store = useGenerationStore()

  const startGeneration = async (prompt: string, existingPageId?: string | null) => {
    // Capture current pageId before startStreaming resets it
    const pageId = existingPageId ?? useGenerationStore.getState().pageId
    store.startStreaming(prompt)

    const abortController = new AbortController()

    try {
      const response = await generateSSE(prompt, pageId, abortController.signal)

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
              store.finishStreaming(event.page_id, event.title || '')
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

    return abortController
  }

  return { startGeneration, abortController: new AbortController() }
}
