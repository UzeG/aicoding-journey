import api from './client'
import type {
  AdminAuditLogItem,
  AdminLLMConfigs,
  AdminPageDetail,
  AdminPageListItem,
  AdminStats,
  AdminSystemPrompts,
  AdminTraceDetail,
  AdminTraceListItem,
  AdminUserDetail,
  AdminUserListItem,
  Paginated,
} from '../types/admin'

// Stats
export const getAdminStats = () => api.get<AdminStats>('/admin/stats')

// Users
export const listAdminUsers = (params: { search?: string; page?: number; page_size?: number }) =>
  api.get<Paginated<AdminUserListItem>>('/admin/users', { params })
export const getAdminUser = (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`)

// Pages
export const listAdminPages = (params: { search?: string; user_id?: string; page?: number; page_size?: number }) =>
  api.get<Paginated<AdminPageListItem>>('/admin/pages', { params })
export const getAdminPage = (pk: string) => api.get<AdminPageDetail>(`/admin/pages/${pk}`)

// Traces
export const listAdminTraces = (params: { source?: string; status?: string; search?: string; page?: number; page_size?: number }) =>
  api.get<Paginated<AdminTraceListItem>>('/admin/traces', { params })
export const getAdminTrace = (id: string) => api.get<AdminTraceDetail>(`/admin/traces/${id}`)

// Audit logs
export const listAdminAuditLogs = (params: { search?: string; page?: number; page_size?: number }) =>
  api.get<Paginated<AdminAuditLogItem>>('/admin/audit-logs', { params })

// LLM configs & system prompts
export const getAdminLLMConfigs = () => api.get<AdminLLMConfigs>('/admin/llm-configs')
export const getAdminSystemPrompts = () => api.get<AdminSystemPrompts>('/admin/system-prompts')

// Test console (SSE via native fetch, mirrors generateSSE)
export const testGenerateSSE = (
  body: { prompt: string; config?: { model?: string; base_url?: string; api_key?: string } },
  signal?: AbortSignal,
) =>
  fetch('/api/admin/test-generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(body),
    signal,
  })
