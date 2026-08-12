import { create } from 'zustand'

interface GenerationState {
  isStreaming: boolean
  codeContent: string
  pageId: string | null
  prompt: string
  title: string
  isSaved: boolean
  error: string | null
  progressStep: string | null
  progressMessage: string

  startStreaming: (prompt: string) => void
  appendCode: (content: string) => void
  setCode: (content: string) => void
  loadPage: (pageId: string, codeContent: string, prompt: string, isSaved?: boolean, title?: string) => void
  finishStreaming: (pageId: string, title?: string) => void
  setTitle: (title: string) => void
  setProgress: (step: string, message: string) => void
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
  progressStep: null,
  progressMessage: '',

  startStreaming: (prompt) =>
    set({ isStreaming: true, codeContent: '', pageId: null, prompt, title: '', isSaved: false, error: null, progressStep: null, progressMessage: '' }),

  appendCode: (content) =>
    set((state) => ({ codeContent: state.codeContent + content })),

  setCode: (content: string) =>
    set({ codeContent: content }),

  loadPage: (pageId, codeContent, prompt, isSaved = false, title = '') =>
    set({ pageId, codeContent, prompt, isSaved, title, isStreaming: false, error: null }),

  finishStreaming: (pageId, title = '') =>
    set({ isStreaming: false, pageId, title, progressStep: null, progressMessage: '' }),

  setTitle: (title) =>
    set({ title }),

  setProgress: (step, message) =>
    set({ progressStep: step, progressMessage: message }),

  setSaved: () =>
    set({ isSaved: true }),

  setError: (error) =>
    set({ isStreaming: false, error }),

  reset: () =>
    set({ isStreaming: false, codeContent: '', pageId: null, prompt: '', title: '', isSaved: false, error: null, progressStep: null, progressMessage: '' }),
}))
