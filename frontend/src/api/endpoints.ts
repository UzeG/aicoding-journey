import api from './client'
import type { ActivityResponse, CheckPageIdResponse, CheckUserIdResponse, FollowResponse, FollowUserItem, LLMSettings, PageDetail, PageItem, PublishResult, RecommendedPrompt, User, UserProfile } from '../types'

// Auth
export const login = (account: string, password: string) =>
  api.post<{ access_token: string }>('/auth/login', { account, password })

export const register = (phone: string, password: string, user_id: string, nickname?: string) =>
  api.post<{ access_token: string }>('/auth/register', { phone, password, user_id, nickname })

export const checkUserId = (user_id: string) =>
  api.get<CheckUserIdResponse>('/auth/check', { params: { user_id } })

export const getMe = () => api.get<User>('/auth/me')
export const updateProfile = (data: { nickname?: string; bio?: string; readme?: string; theme?: string; appearance?: string }) =>
  api.put<User>('/auth/me', data)
export const uploadAvatar = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  // Override default JSON Content-Type so axios auto-sets multipart boundary
  return api.post<User>('/auth/me/avatar', form, { headers: { 'Content-Type': undefined } })
}

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
export const updatePage = (id: string, data: { title?: string; html_content?: string; tags?: string[] }) =>
  api.put<PageDetail>(`/pages/${id}`, data)
export const publishPage = (id: string, title?: string, page_id?: string, tags?: string[]) =>
  api.post<PublishResult>(`/pages/${id}/publish`, { title, page_id, tags })
export const checkPageId = (page_id: string) =>
  api.get<CheckPageIdResponse>('/pages/check-id', { params: { page_id } })
export const updatePageId = (id: string, page_id: string) =>
  api.put<{ page_id: string; url: string }>(`/pages/${id}/page-id`, { page_id })
export const saveDraft = (id: string, title?: string) =>
  api.post<{ ok: boolean; page_id?: string; derived?: boolean }>(`/pages/${id}/save-draft`, { title })
export const deletePage = (id: string) => api.delete(`/pages/${id}`)
export const uploadHtml = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  // Override default JSON Content-Type so axios auto-sets multipart boundary
  return api.post<PageDetail>('/pages/upload', form, { headers: { 'Content-Type': undefined } })
}

// Users
export const getUserProfile = (user_id: string) => api.get<UserProfile>(`/users/${user_id}`)
export const followUser = (user_id: string) => api.post<FollowResponse>(`/users/${user_id}/follow`)
export const unfollowUser = (user_id: string) => api.delete<FollowResponse>(`/users/${user_id}/follow`)
export const getFollowers = (user_id: string) => api.get<FollowUserItem[]>(`/users/${user_id}/followers`)
export const getFollowing = (user_id: string) => api.get<FollowUserItem[]>(`/users/${user_id}/following`)
export const getUserActivity = (user_id: string, year?: number) =>
  api.get<ActivityResponse>(`/users/${user_id}/activity`, { params: year ? { year } : {} })

// Prompts
export const listPrompts = () => api.get<RecommendedPrompt[]>('/prompts')

// Settings
export const getLLMSettings = () => api.get<LLMSettings>('/settings/llm')
export const updateLLMSettings = (data: { model?: string; api_key?: string; base_url?: string }) =>
  api.put<LLMSettings>('/settings/llm', data)
