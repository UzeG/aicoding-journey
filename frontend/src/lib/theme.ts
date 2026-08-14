// 个人主题色：只换主色（标签色），不动纸面/墨色/中性灰 —— 保持 Markup 底盘统一。
// 全部经过白字对比度校验（≥ 4.5:1），保证主按钮白字可读。

export interface ThemeAccent {
  key: string
  label: string
  hex: string
}

/** 第一个是平台默认的深青；其余为经过对比度校验的候选（白字 ≥ 4.5:1） */
export const THEME_ACCENTS: ThemeAccent[] = [
  { key: 'teal', label: '深青', hex: '#0E7A6C' },
  { key: 'slate', label: '石板蓝', hex: '#3D5A80' },
  { key: 'indigo', label: '靛蓝', hex: '#46549C' },
  { key: 'moss', label: '墨绿', hex: '#3F6B4F' },
  { key: 'plum', label: '紫', hex: '#6E3B5E' },
  { key: 'amber', label: '深琥珀', hex: '#A8580F' },
  { key: 'crimson', label: '暗红', hex: '#A8342B' },
]

export const DEFAULT_THEME = THEME_ACCENTS[0].hex

const THEME_STORAGE_KEY = 'manifest.theme'

/** 覆盖根元素的 --primary/--ring/--live。传入 null 时移除覆盖，回落到 :root 默认 */
export function applyTheme(hex: string | null | undefined): void {
  const root = document.documentElement
  const vars = ['--primary', '--ring', '--live'] as const
  if (!hex) {
    vars.forEach((v) => root.style.removeProperty(v))
  } else {
    vars.forEach((v) => root.style.setProperty(v, hex))
  }
  // 通知关注主题色的组件（如 hero 粒子场）重新读取 --primary
  window.dispatchEvent(new CustomEvent('themechange'))
}

/** 读取缓存的个人主题色（首帧用，避免刷新闪默认色） */
export function getCachedTheme(): string | null {
  return localStorage.getItem(THEME_STORAGE_KEY)
}

export function cacheTheme(hex: string | null): void {
  if (hex) localStorage.setItem(THEME_STORAGE_KEY, hex)
  else localStorage.removeItem(THEME_STORAGE_KEY)
}

/** 用户实际生效的主题色（服务端优先，空则回落缓存/默认） */
export function activeTheme(userTheme?: string | null): string {
  return userTheme || getCachedTheme() || DEFAULT_THEME
}
