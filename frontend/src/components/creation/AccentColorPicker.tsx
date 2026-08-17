import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { THEME_ACCENTS } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

const DEFAULT_ACCENT = '#00a650'
const PRESETS = THEME_ACCENTS.map((a) => a.hex)

interface Props {
  /** 当前选中的主色调；null = 用平台默认 #00a650 */
  value: string | null
  /** 登录用户的系统主题色（无则 null，不显示系统主题选项） */
  systemTheme?: string | null
  onChange: (color: string | null) => void
}

/** 选 AI 生成主色调：预设色 + 自定义色盘 + 系统主题配色（登录用户）。 */
export default function AccentColorPicker({ value, systemTheme, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const current = value || DEFAULT_ACCENT
  const select = (c: string | null) => {
    onChange(c)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" onClick={() => setOpen((o) => !o)} className="gap-1.5">
        <span className="size-3.5 rounded-full border border-border" style={{ background: current }} />
        <span className="hidden sm:inline">主色调</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-border bg-card shadow-lg p-3">
          <p className="text-xs text-muted-foreground mb-2">AI 生成主色调</p>

          {/* 预设色 */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => select(c)}
                className={cn(
                  'size-6 rounded-full border border-border transition-transform hover:scale-110',
                  value === c && 'ring-2 ring-primary ring-offset-1'
                )}
                style={{ background: c }}
                aria-label={`预设色 ${c}`}
              />
            ))}
          </div>

          {/* 自定义色盘 */}
          <div className="flex items-center gap-2 mt-3">
            <label className="text-xs text-muted-foreground shrink-0">自定义</label>
            <input
              type="color"
              value={current}
              onChange={(e) => select(e.target.value)}
              className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <span className="font-mono text-xs text-muted-foreground">{current}</span>
          </div>

          {/* 系统主题配色（登录用户，提示这是系统主题） */}
          {systemTheme && (
            <button
              type="button"
              onClick={() => select(systemTheme)}
              className="flex items-center gap-2 mt-3 w-full text-left rounded-md px-1.5 py-1 hover:bg-accent transition-colors"
            >
              <span className="size-6 rounded-full border border-border" style={{ background: systemTheme }} />
              <span className="text-xs text-muted-foreground">系统主题配色</span>
              {value === systemTheme && <Check className="size-3.5 text-primary ml-auto" />}
            </button>
          )}

          {/* 恢复默认 */}
          {value && (
            <button
              type="button"
              onClick={() => select(null)}
              className="mt-3 w-full text-left px-1.5 py-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              恢复默认（#00a650）
            </button>
          )}
        </div>
      )}
    </div>
  )
}
