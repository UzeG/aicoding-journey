export interface User {
  id: string
  phone: string
  nickname: string | null
  user_type: string
  token_balance: number
  created_at: string
}

export interface PageItem {
  id: string
  short_code: string | null
  title: string | null
  is_published: boolean
  visibility: string
  status: string
  created_at: string
  updated_at: string
}

export interface PageDetail extends PageItem {
  html_content: string
  original_prompt: string | null
  file_size: number | null
}

export interface Template {
  id: number
  name: string
  description: string | null
  icon: string | null
  category: string | null
  prompt_hint: string | null
  sort_order: number
}

export interface LLMSettings {
  model: string | null
  base_url: string | null
  has_api_key: boolean
}

export interface PublishResult {
  id: string
  short_code: string
  url: string
}
