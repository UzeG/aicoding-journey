export interface User {
  id: string
  phone: string
  nickname: string | null
  user_type: string
  user_id?: string | null
  token_balance: number
  created_at: string
}

export interface PageItem {
  id: string
  page_id: string | null
  title: string | null
  is_published: boolean
  is_saved: boolean
  visibility: string
  status: string
  created_at: string
  updated_at: string
}

export interface PageDetail extends PageItem {
  html_content: string
  prompt: string | null
  file_size: number | null
  is_saved: boolean
}

export interface RecommendedPrompt {
  id: number
  prompt: string
}

export interface LLMSettings {
  model: string | null
  base_url: string | null
  has_api_key: boolean
}

export interface PublishResult {
  id: string
  page_id: string
  url: string
}

export interface CheckUserIdResponse {
  available: boolean
}

export interface CheckPageIdResponse {
  available: boolean
}

export interface UserPublic {
  nickname: string | null
  user_id: string | null
}

export interface UserProfile {
  user: UserPublic
  pages: PageItem[]
}
