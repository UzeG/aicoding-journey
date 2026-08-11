import { create } from 'zustand'

interface GenerationState {
  isStreaming: boolean
  codeContent: string
  pageId: string | null
  prompt: string
  error: string | null

  startStreaming: (prompt: string) => void
  appendCode: (content: string) => void
  setCode: (content: string) => void
  loadPage: (pageId: string, codeContent: string, prompt: string) => void
  finishStreaming: (pageId: string) => void
  setError: (error: string) => void
  reset: () => void
}

export const useGenerationStore = create<GenerationState>((set) => ({
  isStreaming: false,
  codeContent: '',
  pageId: null,
  prompt: '',
  error: null,

  startStreaming: (prompt) =>
    set({ isStreaming: true, codeContent: '', pageId: null, prompt, error: null }),

  appendCode: (content) =>
    set((state) => ({ codeContent: state.codeContent + content })),

  setCode: (content: string) =>
    set({ codeContent: content }),

  loadPage: (pageId, codeContent, prompt) =>
    set({ pageId, codeContent, prompt, isStreaming: false, error: null }),

  finishStreaming: (pageId) =>
    set({ isStreaming: false, pageId }),

  setError: (error) =>
    set({ isStreaming: false, error }),

  reset: () =>
    set({ isStreaming: false, codeContent: '', pageId: null, prompt: '', error: null }),
}))
