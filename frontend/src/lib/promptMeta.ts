import { Table2, Calculator, Gift, Disc3, Gauge, Sparkles, type LucideIcon } from 'lucide-react'

export interface PromptMeta {
  icon: LucideIcon
  accentClass: string // 完整字面量类名，Tailwind JIT 才能扫到；禁止动态拼接 bg-${...}
  label: string
}

interface PromptRule {
  keywords: string[]
  meta: PromptMeta
}

// 顺序即优先级：更具体的词放前面，命中即返回
const RULES: PromptRule[] = [
  {
    keywords: ['对比', '套餐'],
    meta: { icon: Table2, accentClass: 'bg-primary/10 text-primary', label: '对比表' },
  },
  {
    keywords: ['计算器'],
    meta: { icon: Calculator, accentClass: 'bg-sky-500/10 text-sky-600', label: '计算器' },
  },
  {
    keywords: ['贺卡', '祝福', '中秋'],
    meta: { icon: Gift, accentClass: 'bg-rose-500/10 text-rose-600', label: '贺卡' },
  },
  {
    keywords: ['转盘', '抽奖'],
    meta: { icon: Disc3, accentClass: 'bg-amber-500/10 text-amber-600', label: '抽奖' },
  },
  {
    keywords: ['仪表盘', '图表', '数据'],
    meta: { icon: Gauge, accentClass: 'bg-violet-500/10 text-violet-600', label: '仪表盘' },
  },
]

const FALLBACK: PromptMeta = {
  icon: Sparkles,
  accentClass: 'bg-muted text-muted-foreground',
  label: '灵感',
}

/** 按关键词给推荐提示词映射图标/配色/标签；无命中回落 FALLBACK */
export function resolvePromptMeta(prompt: string): PromptMeta {
  const hit = RULES.find((r) => r.keywords.some((k) => prompt.includes(k)))
  return hit?.meta ?? FALLBACK
}
