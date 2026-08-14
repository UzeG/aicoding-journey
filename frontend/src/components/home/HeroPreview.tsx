import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { HeroMode } from './HeroInput'

/**
 * Hero 部署演示（中性）：一个页面「组装 → 部署中 → 已上线」。
 * 不出现 AI 打字动画——上传或生成都只是把页面送上线。
 * - 上传：标题跟随文件名；生成：标题跟随输入文字；无输入时自演样本
 * - reduced-motion：静态展示完整结果
 */

type Elem =
  | { kind: 'title'; text: string }
  | { kind: 'row'; label: string; value: string }
  | { kind: 'button'; text: string }
  | { kind: 'result'; text: string }

const SAMPLE_ELEMENTS: Elem[] = [
  { kind: 'title', text: '话费计算器' },
  { kind: 'row', label: '套餐月费', value: '58 元' },
  { kind: 'row', label: '通话分钟', value: '300 分钟' },
  { kind: 'button', text: '计算' },
  { kind: 'result', text: '预计本月 68.5 元' },
]

function generateElements(prompt: string): Elem[] {
  const t = prompt.trim().slice(0, 24)
  return [
    { kind: 'title', text: t || '你的页面' },
    { kind: 'row', label: '输入一', value: '…' },
    { kind: 'row', label: '输入二', value: '…' },
    { kind: 'button', text: '开始使用' },
    { kind: 'result', text: '已就绪' },
  ]
}

function uploadElements(name: string): Elem[] {
  const base = name.replace(/\.html?$/i, '').trim().slice(0, 24) || '你的页面'
  return [
    { kind: 'title', text: base },
    { kind: 'row', label: '来源', value: '上传' },
    { kind: 'row', label: '访问', value: '公网链接' },
    { kind: 'button', text: '打开' },
    { kind: 'result', text: '已上线' },
  ]
}

function slugify(s: string): string {
  const t = s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '').slice(0, 12)
  return t || 'your-page'
}

function renderElem(el: Elem) {
  switch (el.kind) {
    case 'title':
      return <p className="text-base font-semibold text-foreground mb-3">{el.text}</p>
    case 'row':
      return (
        <div className="flex items-center justify-between py-1.5 text-xs border-b border-border/60 last:border-0">
          <span className="text-muted-foreground">{el.label}</span>
          <span className="text-foreground font-medium">{el.value}</span>
        </div>
      )
    case 'button':
      return (
        <div className="mt-3 mb-2">
          <span className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            {el.text}
          </span>
        </div>
      )
    case 'result':
      return <p className="mt-1 text-sm font-semibold text-primary">{el.text}</p>
  }
}

export default function HeroPreview({
  prompt,
  mode,
  fileName,
}: {
  prompt: string
  mode: HeroMode
  fileName?: string
}) {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const isUpload = mode === 'upload'
  const [stage, setStage] = useState<'building' | 'deployed'>('building')
  const [elemCount, setElemCount] = useState(0)

  // 切换模式时重置组装
  useEffect(() => {
    setStage('building')
    setElemCount(0)
  }, [isUpload])

  const elements = isUpload
    ? uploadElements(fileName || '')
    : prompt.trim()
      ? generateElements(prompt)
      : SAMPLE_ELEMENTS
  const sourceText = isUpload ? fileName || '你的页面' : prompt.trim() || '一个能用的页面'

  // 自演：组装 → 已上线 → 循环
  useEffect(() => {
    if (reduced) return
    let t: ReturnType<typeof setTimeout>
    if (stage === 'building') {
      t = elemCount < elements.length
        ? setTimeout(() => setElemCount((c) => c + 1), 300)
        : setTimeout(() => setStage('deployed'), 350)
    } else {
      t = setTimeout(() => {
        setStage('building')
        setElemCount(0)
      }, 2600)
    }
    return () => clearTimeout(t)
  }, [reduced, stage, elemCount, elements.length])

  const deployed = reduced || stage === 'deployed'
  const shown = reduced ? elements.length : elemCount
  const pageId = isUpload
    ? (fileName || 'your-page').replace(/\.html?$/i, '').replace(/[^\w一-龥-]/g, '')
    : prompt.trim()
      ? slugify(prompt)
      : 'bill-calc'

  return (
    <div
      className="rounded-xl border border-border bg-white shadow-[0_28px_60px_-28px_rgba(24,32,28,0.28)] overflow-hidden"
      role="img"
      aria-label="产品演示：一个 HTML 页面部署上线"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50">
        <span className="font-mono text-xs text-muted-foreground">部署结果</span>
        <span
          className={`flex items-center gap-1.5 font-mono text-xs ${
            deployed ? 'text-success' : 'text-live'
          }`}
        >
          <span className={`size-1.5 rounded-full ${deployed ? 'bg-success' : 'bg-live animate-pulse'}`} />
          {deployed ? '已上线' : '部署中'}
        </span>
      </div>

      {/* 内容：来源行 + 页面画布 */}
      <div className="px-5 py-4">
        <p className="font-mono text-xs text-muted-foreground mb-3">
          <span className="text-live">{isUpload ? '+' : '>'}</span> {sourceText}
        </p>

        <div className="rounded-lg bg-muted/40 p-4 flex items-center justify-center min-h-51">
          <div className="w-full max-w-66 rounded-lg border border-border bg-card shadow-sm p-4">
            {elements.slice(0, shown).map((el, i) => (
              <div key={i} className="animate-fade-up">
                {renderElem(el)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：部署链接 */}
      <div className="px-4 py-3 border-t border-border bg-white flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted-foreground">$ 上传或生成 → 部署 → 链接</span>
        {deployed && (
          <span className="flex items-center gap-1 font-mono text-xs text-success">
            demo/{pageId}
            <ExternalLink className="size-3" />
          </span>
        )}
      </div>
    </div>
  )
}
