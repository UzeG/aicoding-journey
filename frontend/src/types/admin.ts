// Admin types — mirror backend app/schemas admin models.
// Page/Trace ids are Snowflake strings — never parseInt them.

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface AdminStats {
  users_count: number
  pages_count: number
  published_pages_count: number
  traces_count: number
  success_traces: number
  error_traces: number
  audit_count: number
  users_with_llm_config: number
}

export interface AdminUserListItem {
  id: string
  phone: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  user_id: string | null
  token_balance: number
  is_admin: boolean
  pages_count: number
  created_at: string
}

export interface AdminUserDetail extends AdminUserListItem {
  llm_model: string | null
  llm_base_url: string | null
  has_api_key: boolean
}

export interface AdminPageListItem {
  id: string
  page_id: string | null
  user_id: string
  user_nickname: string | null
  title: string | null
  cover_url: string | null
  is_published: boolean
  is_saved: boolean
  visibility: string
  status: string
  file_size: number | null
  created_at: string
  updated_at: string
}

export interface AdminPageDetail extends AdminPageListItem {
  prompt: string | null
  step1_output: string | null
  html_content: string
}

export interface AdminTraceListItem {
  id: string
  source: string
  status: string
  user_id: string | null
  page_fk: string | null
  prompt: string | null
  model: string | null
  config_source: string | null
  tokens_used: number | null
  duration_ms: number | null
  created_at: string
}

export interface AdminTraceDetail extends AdminTraceListItem {
  refined_prompt: string | null
  libraries: string | null
  step1_output: string | null
  step2_raw: string | null
  final_html: string | null
  base_url: string | null
  error_message: string | null
}

export interface AdminAuditLogItem {
  id: string
  user_id: string | null
  action: string
  content: string | null
  result: string | null
  client_ip: string | null
  created_at: string
}

export interface AdminLLMConfigUser {
  user_id: string | null
  nickname: string | null
  phone: string
  model: string | null
  base_url: string | null
  has_api_key: boolean
}

export interface AdminLLMConfigs {
  platform: { model: string | null; base_url: string | null; has_api_key: boolean }
  users: AdminLLMConfigUser[]
}

export interface AdminSystemPrompts {
  step1: string
  step2: string
}
