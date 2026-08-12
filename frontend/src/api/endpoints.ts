import api from './client'
import type { LLMSettings, PageDetail, PageItem, PublishResult, RecommendedPrompt, User } from '../types'

// Auth
export const login = (phone: string, password: string) =>
  api.post<{ access_token: string }>('/auth/login', { phone, password })

export const register = (phone: string, password: string, nickname?: string) =>
  api.post<{ access_token: string }>('/auth/register', { phone, password, nickname })

export const getMe = () => api.get<User>('/auth/me')

// Generate
export const generateSSE = (prompt: string, pageId?: string | null, signal?: AbortSignal) =>
  fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify({ prompt, page_id: pageId || null }),
    signal,
  })

// Pages
export const listPages = () => api.get<PageItem[]>('/pages')
export const getPage = (id: string) => api.get<PageDetail>(`/pages/${id}`)
export const updatePage = (id: string, data: { title?: string; html_content?: string }) =>
  api.put<PageDetail>(`/pages/${id}`, data)
export const publishPage = (id: string, title?: string) =>
  api.post<PublishResult>(`/pages/${id}/publish`, { title })
export const saveDraft = (id: string, title?: string) =>
  api.post(`/pages/${id}/save-draft`, { title })
export const deletePage = (id: string) => api.delete(`/pages/${id}`)

// Prompts
export const listPrompts = () => api.get<RecommendedPrompt[]>('/prompts')

// Settings
export const getLLMSettings = () => api.get<LLMSettings>('/settings/llm')
export const updateLLMSettings = (data: { model?: string; api_key?: string; base_url?: string }) =>
  api.put<LLMSettings>('/settings/llm', data)
