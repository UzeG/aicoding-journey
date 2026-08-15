import { create } from 'zustand'

interface GenerationState {
  isStreaming: boolean
  codeContent: string
  pageId: string | null
  prompt: string
  title: string
  tags: string[]
  isSaved: boolean
  error: string | null
  progressStep: string | null
  progressMessage: string

  startStreaming: (prompt: string) => void
  appendCode: (content: string) => void
  setCode: (content: string) => void
  loadPage: (pageId: string, codeContent: string, prompt: string, isSaved?: boolean, title?: string, tags?: string[]) => void
  finishStreaming: (pageId: string, title?: string, tags?: string[]) => void
  setPageId: (pageId: string) => void
  setTitle: (title: string) => void
  setTags: (tags: string[]) => void
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
  tags: [],
  isSaved: false,
  error: null,
  progressStep: null,
  progressMessage: '',

  startStreaming: (prompt) =>
    set({ isStreaming: true, codeContent: '', pageId: null, prompt, title: '', tags: [], isSaved: false, error: null, progressStep: null, progressMessage: '' }),

  appendCode: (content) =>
    set((state) => ({ codeContent: state.codeContent + content })),

  setCode: (content: string) =>
    set({ codeContent: content }),

  loadPage: (pageId, codeContent, prompt, isSaved = false, title = '', tags = []) =>
    set({ pageId, codeContent, prompt, isSaved, title, tags, isStreaming: false, error: null }),

  finishStreaming: (pageId, title = '', tags = []) =>
    set({ isStreaming: false, pageId, title, tags, progressStep: null, progressMessage: '' }),

  setPageId: (pageId) =>
    set({ pageId }),

  setTitle: (title) =>
    set({ title }),

  setTags: (tags) =>
    set({ tags }),

  setProgress: (step, message) =>
    set({ progressStep: step, progressMessage: message }),

  setSaved: () =>
    set({ isSaved: true }),

  setError: (error) =>
    set({ isStreaming: false, error }),

  reset: () =>
    set({ isStreaming: false, codeContent: '', pageId: null, prompt: '', title: '', tags: [], isSaved: false, error: null, progressStep: null, progressMessage: '' }),
}))
