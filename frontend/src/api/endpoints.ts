import api from './client'
import type { CheckPageIdResponse, CheckUserIdResponse, LLMSettings, PageDetail, PageItem, PublishResult, RecommendedPrompt, User, UserProfile } from '../types'

// Auth
export const login = (account: string, password: string) =>
  api.post<{ access_token: string }>('/auth/login', { account, password })

export const register = (phone: string, password: string, user_id: string, nickname?: string) =>
  api.post<{ access_token: string }>('/auth/register', { phone, password, user_id, nickname })

export const checkUserId = (user_id: string) =>
  api.get<CheckUserIdResponse>('/auth/check', { params: { user_id } })

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
export const publishPage = (id: string, title?: string, page_id?: string) =>
  api.post<PublishResult>(`/pages/${id}/publish`, { title, page_id })
export const checkPageId = (page_id: string) =>
  api.get<CheckPageIdResponse>('/pages/check-id', { params: { page_id } })
export const updatePageId = (id: string, page_id: string) =>
  api.put<{ page_id: string; url: string }>(`/pages/${id}/page-id`, { page_id })
export const saveDraft = (id: string, title?: string) =>
  api.post(`/pages/${id}/save-draft`, { title })
export const deletePage = (id: string) => api.delete(`/pages/${id}`)

// Users
export const getUserProfile = (user_id: string) => api.get<UserProfile>(`/users/${user_id}`)

// Prompts
export const listPrompts = () => api.get<RecommendedPrompt[]>('/prompts')

// Settings
export const getLLMSettings = () => api.get<LLMSettings>('/settings/llm')
export const updateLLMSettings = (data: { model?: string; api_key?: string; base_url?: string }) =>
  api.put<LLMSettings>('/settings/llm', data)
