import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'

/**
 * Hero 工具预览：把「一句话 → 一个能用的工具 → 部署链接」在首页上跑起来。
 * - 无输入时自演：样本 prompt 打字机输入 → 迷你工具界面逐个组装 → 已部署 → 循环
 * - 访客在 hero 输入框打字时，切到用户模式：标题跟随他的文字，生成一遍
 * - reduced-motion：静态展示完整结果
 */

const SAMPLE_PROMPT = '做一个话费计算器'

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

function userElements(prompt: string): Elem[] {
  const t = prompt.trim().slice(0, 24)
  return [
    { kind: 'title', text: t || '你的工具' },
    { kind: 'row', label: '输入一', value: '…' },
    { kind: 'row', label: '输入二', value: '…' },
    { kind: 'button', text: '开始使用' },
    { kind: 'result', text: '已就绪' },
  ]
}

function slugify(s: string): string {
  const t = s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '').slice(0, 12)
  return t || 'your-tool'
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

export default function HeroPreview({ prompt }: { prompt: string }) {
  const userMode = prompt.trim().length > 0
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const [stage, setStage] = useState<'typing' | 'building' | 'deployed'>('typing')
  const [pChars, setPChars] = useState(0)
  const [elemCount, setElemCount] = useState(0)

  const prevUser = useRef(userMode)
  useEffect(() => {
    if (prevUser.current === userMode) return
    prevUser.current = userMode
    setStage(userMode ? 'building' : 'typing')
    setPChars(SAMPLE_PROMPT.length)
    setElemCount(0)
  }, [userMode])

  // 自演循环（无输入时）
  useEffect(() => {
    if (userMode || reduced) return
    let t: ReturnType<typeof setTimeout>
    if (stage === 'typing') {
      t = pChars < SAMPLE_PROMPT.length
        ? setTimeout(() => setPChars((c) => c + 1), 70)
        : setTimeout(() => setStage('building'), 280)
    } else if (stage === 'building') {
      t = elemCount < SAMPLE_ELEMENTS.length
        ? setTimeout(() => setElemCount((c) => c + 1), 420)
        : setTimeout(() => setStage('deployed'), 350)
    } else {
      t = setTimeout(() => {
        setStage('typing')
        setPChars(0)
        setElemCount(0)
      }, 2600)
    }
    return () => clearTimeout(t)
  }, [userMode, reduced, stage, pChars, elemCount])

  // 用户模式：组装一次
  useEffect(() => {
    if (!userMode || reduced) return
    if (stage !== 'building') return
    let t: ReturnType<typeof setTimeout>
    if (elemCount < userElements(prompt).length) {
      t = setTimeout(() => setElemCount((c) => c + 1), 200)
    } else {
      t = setTimeout(() => setStage('deployed'), 300)
    }
    return () => clearTimeout(t)
  }, [userMode, reduced, stage, elemCount, prompt])

  const requestText = userMode ? prompt.trim() : SAMPLE_PROMPT.slice(0, reduced ? SAMPLE_PROMPT.length : pChars)
  const elements = userMode ? userElements(prompt) : SAMPLE_ELEMENTS
  const shown = reduced ? elements.length : elemCount
  const deployed = reduced || stage === 'deployed'
  const pageId = userMode ? slugify(prompt) : 'bill-calc'

  return (
    <div
      className="rounded-xl border border-border bg-white shadow-[0_28px_60px_-28px_rgba(24,32,28,0.28)] overflow-hidden"
      role="img"
      aria-label="产品演示：一句话生成一个能用的工具并部署"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50">
        <span className="font-mono text-xs text-muted-foreground">生成结果</span>
        <span
          className={`flex items-center gap-1.5 font-mono text-xs ${
            deployed ? 'text-success' : 'text-live'
          }`}
        >
          <span className={`size-1.5 rounded-full ${deployed ? 'bg-success' : 'bg-live animate-pulse'}`} />
          {deployed ? '已部署' : '生成中'}
        </span>
      </div>

      {/* 内容：请求行 + 工具画布 */}
      <div className="px-5 py-4">
        <p className="font-mono text-xs text-muted-foreground mb-3">
          <span className="text-live">&gt;</span> {requestText}
          {!deployed && stage === 'typing' && (
            <span className="inline-block w-[0.55em] h-[1em] translate-y-[0.16em] bg-live animate-pulse" />
          )}
        </p>

        <div className="rounded-lg bg-muted/40 p-4 flex items-center justify-center min-h-[204px]">
          <div className="w-full max-w-[264px] rounded-lg border border-border bg-card shadow-sm p-4">
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
        <span className="font-mono text-xs text-muted-foreground">$ 一句话 → 工具 → 链接</span>
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
