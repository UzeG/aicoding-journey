export interface User {
  id: string
  phone: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  /** 个人主题色（#RRGGBB），空则用平台默认石板蓝 */
  theme?: string | null
  /** 外观模式：light / dark / system */
  appearance?: string | null
  user_type: string
  user_id?: string | null
  token_balance: number
  is_admin?: boolean
  created_at: string
}

export interface PageItem {
  id: string
  page_id: string | null
  title: string | null
  cover_url: string | null
  /** 页面标签（AI 生成 + 用户可改），供 gallery 检索/展示 */
  tags?: string[]
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
  avatar_url: string | null
  bio: string | null
  readme: string | null
  user_id: string | null
}

export interface UserProfile {
  user: UserPublic
  pages: PageItem[]
  follower_count: number
  following_count: number
  is_following: boolean
}

export interface FollowUserItem {
  id: string
  user_id: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  is_following: boolean
}

export interface FollowResponse {
  ok: boolean
  is_following: boolean
  follower_count: number
}

export interface GalleryAuthor {
  user_id: string
  nickname: string | null
  avatar_url: string | null
}

export interface GalleryItem {
  id: string
  page_id: string
  title: string | null
  cover_url: string | null
  tags: string[]
  url: string
  created_at: string
  like_count: number
  favorite_count: number
  author: GalleryAuthor
}

export interface TagCount {
  tag: string
  count: number
}

export interface GalleryResponse {
  items: GalleryItem[]
  total: number
  page: number
  page_size: number
  tag_counts: TagCount[]
}

export interface ActivityDay {
  date: string
  count: number
}

export interface ActivityResponse {
  year: number
  days: ActivityDay[]
  years: number[]
}
