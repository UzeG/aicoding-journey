import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ExternalLink, Globe, Rocket, ShieldCheck, Upload } from 'lucide-react'
import type { HeroMode } from './HeroInput'

/**
 * Hero 右侧演示，按左侧 tab 呈现不同效果：
 * - 上传 HTML：部署流程图（上传 → 校验 → 部署 → 上线，节点逐个点亮）
 * - AI 生成：一句话需求 → 渐进式生成页面（打字 + 页面逐个组装 → 已上线）
 * - reduced-motion：静态呈现最终已上线结果
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

function slugify(s: string): string {
  const t = s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '').slice(0, 12)
  return t || 'your-page'
}

const FLOW_STEPS = [
  { icon: Upload, label: '上传', sub: '你的文件' },
  { icon: ShieldCheck, label: '校验', sub: '安全通过' },
  { icon: Rocket, label: '部署', sub: '公网' },
  { icon: Globe, label: '上线', sub: '可访问' },
]

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
  const userTyped = !isUpload && prompt.trim().length > 0

  const [stage, setStage] = useState<'typing' | 'building' | 'deployed'>('typing')
  const [pChars, setPChars] = useState(0)
  const [elemCount, setElemCount] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  // 切换 tab / 输入与否时重置
  const prevTyped = useRef(userTyped)
  useEffect(() => {
    setStage('typing')
    setPChars(0)
    setElemCount(0)
    setStepIndex(0)
    if (prevTyped.current !== userTyped) prevTyped.current = userTyped
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpload, userTyped])

  // ── 生成模式：自演（无输入）──
  useEffect(() => {
    if (isUpload || reduced || userTyped) return
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
  }, [isUpload, reduced, userTyped, stage, pChars, elemCount])

  // ── 生成模式：用户输入，组装一次 ──
  useEffect(() => {
    if (isUpload || reduced || !userTyped) return
    if (stage !== 'building') return
    let t: ReturnType<typeof setTimeout>
    if (elemCount < generateElements(prompt).length) {
      t = setTimeout(() => setElemCount((c) => c + 1), 200)
    } else {
      t = setTimeout(() => setStage('deployed'), 300)
    }
    return () => clearTimeout(t)
  }, [isUpload, reduced, userTyped, stage, elemCount, prompt])

  // ── 上传模式：流程图节点推进 ──
  useEffect(() => {
    if (!isUpload || reduced) return
    let t: ReturnType<typeof setTimeout>
    if (stepIndex < FLOW_STEPS.length) {
      t = setTimeout(() => setStepIndex((i) => i + 1), 700)
    } else {
      t = setTimeout(() => setStepIndex(0), 2400)
    }
    return () => clearTimeout(t)
  }, [isUpload, reduced, stepIndex])

  const elements = isUpload ? [] : userTyped ? generateElements(prompt) : SAMPLE_ELEMENTS
  const deployed = isUpload ? stepIndex === FLOW_STEPS.length : reduced || stage === 'deployed'
  const pageId = isUpload
    ? (fileName || 'your-page').replace(/\.html?$/i, '').replace(/[^\w一-龥-]/g, '')
    : userTyped
      ? slugify(prompt)
      : 'bill-calc'
  const flowFileName = fileName ? fileName.replace(/\.html?$/i, '') : '你的文件'
  const requestText = userTyped ? prompt.trim() : SAMPLE_PROMPT.slice(0, reduced ? SAMPLE_PROMPT.length : pChars)
  const shown = reduced ? elements.length : elemCount

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-[0_28px_60px_-28px_rgba(24,32,28,0.28)] overflow-hidden"
      role="img"
      aria-label="产品演示：上传或生成，一键部署上线"
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

      <div className="px-5 py-4 min-h-64 flex flex-col justify-center">
        {isUpload ? (
          /* 上传模式：部署流程图 */
          <div className="mx-auto w-full max-w-xs">
            {FLOW_STEPS.map((s, i) => {
              const done = i < stepIndex
              const active = i === stepIndex
              return (
                <Fragment key={s.label}>
                  <div
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                      done
                        ? 'border-success/40 bg-success/5 text-foreground'
                        : active
                          ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                          : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    <s.icon className={`size-4 shrink-0 ${active ? 'text-primary' : done ? 'text-success' : ''}`} />
                    <span className="text-sm font-medium">{s.label}</span>
                    {i === 0 ? (
                      <span className="text-xs text-muted-foreground truncate ml-1">{flowFileName}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground ml-1">{s.sub}</span>
                    )}
                    {done && <Check className="size-3.5 text-success ml-auto shrink-0" />}
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="flex items-center justify-center py-0.5 text-muted-foreground/60">
                      <ChevronDown className="size-3.5" />
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        ) : (
          /* 生成模式：一句话渐进式生成页面 */
          <div className="mx-auto w-full max-w-xs">
            <p className="font-mono text-xs text-muted-foreground mb-3">
              <span className="text-live">&gt;</span> {requestText}
              {!deployed && stage === 'typing' && (
                <span className="inline-block w-[0.55em] h-[1em] translate-y-[0.16em] bg-live animate-pulse" />
              )}
            </p>
            <div className="rounded-lg bg-muted/40 p-4 flex items-center justify-center">
              <div className="w-full rounded-lg border border-border bg-card shadow-sm p-4">
                {elements.slice(0, shown).map((el, i) => (
                  <div key={i} className="animate-fade-up">
                    {renderElem(el)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部：公网链接 */}
      <div className="px-4 py-3 border-t border-border bg-card flex items-center justify-between gap-3">
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
