// 外观（浅/深/设备） × 主题色（主色）系统，参考 Chrome「外观 → 主题」。
// 每个主题色都有浅色/深色两种变体：浅色模式用深色系主色（白字可读），
// 深色模式用亮色系主色（深字可读）。纸面/墨色由 .dark 类控制。

export interface ThemeAccent {
  key: string
  label: string
  /** 浅色模式主色（深色系，白字 ≥ 4.5:1） */
  hex: string
  /** 深色模式主色（亮色系，深字 ≥ 4.5:1） */
  darkHex: string
}

/** 第一个是平台默认的深青 */
export const THEME_ACCENTS: ThemeAccent[] = [
  { key: 'teal', label: '深青', hex: '#0E7A6C', darkHex: '#3CC2AB' },
  { key: 'slate', label: '石板蓝', hex: '#3D5A80', darkHex: '#7BA3D2' },
  { key: 'indigo', label: '靛蓝', hex: '#46549C', darkHex: '#97A1EA' },
  { key: 'moss', label: '墨绿', hex: '#3F6B4F', darkHex: '#79B389' },
  { key: 'plum', label: '紫', hex: '#6E3B5E', darkHex: '#BE85AE' },
  { key: 'amber', label: '深琥珀', hex: '#A8580F', darkHex: '#E3A45E' },
  { key: 'crimson', label: '暗红', hex: '#A8342B', darkHex: '#E57F74' },
]

export const DEFAULT_THEME = THEME_ACCENTS[0]

export type AppearanceMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'manifest.theme'
const APPEARANCE_STORAGE_KEY = 'manifest.appearance'

const isMode = (v: string | null | undefined): v is AppearanceMode =>
  v === 'light' || v === 'dark' || v === 'system'

/** 外观 → 是否深色（system 跟随操作系统） */
export function isDarkNow(mode: AppearanceMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 应用外观：切 .dark 类 + 按深浅重算主色变体。
 * themeHex 为空时回落缓存/默认。
 */
export function applyAppearance(mode: AppearanceMode, themeHex?: string | null): void {
  const root = document.documentElement
  root.classList.toggle('dark', isDarkNow(mode))
  localStorage.setItem(APPEARANCE_STORAGE_KEY, mode)
  applyTheme(themeHex ?? getCachedTheme())
}

/** 覆盖 --primary/--ring/--live/--primary-foreground。深色模式用亮色变体 + 深色前景 */
export function applyTheme(hex: string | null | undefined): void {
  const root = document.documentElement
  const dark = root.classList.contains('dark')
  const accent = THEME_ACCENTS.find((a) => a.hex.toLowerCase() === (hex || '').toLowerCase())
  const target = accent && dark ? accent.darkHex : (hex || null)
  if (!target) {
    root.style.removeProperty('--primary')
    root.style.removeProperty('--primary-foreground')
    root.style.removeProperty('--ring')
    root.style.removeProperty('--live')
  } else {
    root.style.setProperty('--primary', target)
    root.style.setProperty('--primary-foreground', dark ? '#10110D' : '#FFFFFF')
    root.style.setProperty('--ring', target)
    root.style.setProperty('--live', target)
  }
  // 通知关注主题色的组件（HeroBackground 等）重新读取 --primary/--foreground
  window.dispatchEvent(new CustomEvent('themechange'))
}

export function getCachedTheme(): string | null {
  return localStorage.getItem(THEME_STORAGE_KEY)
}

export function cacheTheme(hex: string | null): void {
  if (hex) localStorage.setItem(THEME_STORAGE_KEY, hex)
  else localStorage.removeItem(THEME_STORAGE_KEY)
}

export function getCachedAppearance(): AppearanceMode {
  const v = localStorage.getItem(APPEARANCE_STORAGE_KEY)
  return isMode(v) ? v : 'system'
}

export function cacheAppearance(mode: AppearanceMode): void {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, mode)
}

/** 用户生效的主题色（服务端优先，空则回落缓存/默认） */
export function activeTheme(userTheme?: string | null): ThemeAccent {
  const hex = userTheme || getCachedTheme() || DEFAULT_THEME.hex
  return THEME_ACCENTS.find((a) => a.hex.toLowerCase() === hex.toLowerCase()) || DEFAULT_THEME
}

/** 用户生效的外观（服务端优先，空则回落缓存/系统） */
export function activeAppearance(userAppearance?: string | null): AppearanceMode {
  const v = userAppearance || getCachedAppearance()
  return isMode(v) ? v : 'system'
}
