import { create } from 'zustand'

interface GenerationState {
  isStreaming: boolean
  codeContent: string
  pageId: string | null
  prompt: string
  title: string
  isSaved: boolean
  error: string | null

  startStreaming: (prompt: string) => void
  appendCode: (content: string) => void
  setCode: (content: string) => void
  loadPage: (pageId: string, codeContent: string, prompt: string, isSaved?: boolean, title?: string) => void
  finishStreaming: (pageId: string, title?: string) => void
  setTitle: (title: string) => void
  setSaved: () => void
  setError: (error: string) => void
  reset: () => void
}

export const useGenerationStore = create<GenerationState>((set) => ({
  isStreaming: false,
  codeContent: '',
  pageId: null,
  prompt: '',
  title: '',
  isSaved: false,
  error: null,

  startStreaming: (prompt) =>
    set({ isStreaming: true, codeContent: '', pageId: null, prompt, title: '', isSaved: false, error: null }),

  appendCode: (content) =>
    set((state) => ({ codeContent: state.codeContent + content })),

  setCode: (content: string) =>
    set({ codeContent: content }),

  loadPage: (pageId, codeContent, prompt, isSaved = false, title = '') =>
    set({ pageId, codeContent, prompt, isSaved, title, isStreaming: false, error: null }),

  finishStreaming: (pageId, title = '') =>
    set({ isStreaming: false, pageId, title }),

  setTitle: (title) =>
    set({ title }),

  setSaved: () =>
    set({ isSaved: true }),

  setError: (error) =>
    set({ isStreaming: false, error }),

  reset: () =>
    set({ isStreaming: false, codeContent: '', pageId: null, prompt: '', title: '', isSaved: false, error: null }),
}))
