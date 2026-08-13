import type { AccentKey, ThumbVariant } from '../../data/showcase'
import { cn } from '../../lib/utils'

// accent → 静态字面量类名映射（Tailwind JIT 只扫源码里的完整类名，禁止动态拼 bg-${accent}）
const ACCENTS: Record<AccentKey, { bar: string; tint: string }> = {
  emerald: { bar: 'bg-emerald-500', tint: 'bg-emerald-100' },
  sky: { bar: 'bg-sky-500', tint: 'bg-sky-100' },
  rose: { bar: 'bg-rose-500', tint: 'bg-rose-100' },
  amber: { bar: 'bg-amber-500', tint: 'bg-amber-100' },
  violet: { bar: 'bg-violet-500', tint: 'bg-violet-100' },
  cyan: { bar: 'bg-cyan-500', tint: 'bg-cyan-100' },
}

interface Props {
  variant: ThumbVariant
  accent: AccentKey
}

/** 纯 CSS 手绘的页面骨架缩略图，模拟浏览器窗口内的页面结构（TODO 接入真实封面后删除） */
export default function MockThumbnail({ variant, accent }: Props) {
  const a = ACCENTS[accent]

  return (
    <div className="aspect-video p-3 bg-muted/40">
      {/* 伪浏览器顶栏：红黄绿点 + 右侧 accent 品牌条 */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="size-2 rounded-full bg-rose-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className={cn('ml-auto h-2 w-16 rounded-full', a.bar)} />
      </div>
      {renderBody()}
    </div>
  )

  function renderBody() {
    switch (variant) {
      case 'table':
        return (
          <div>
            <div className="flex gap-1.5 mb-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn('h-1.5 flex-1 rounded-full', i === 0 ? a.bar : 'bg-border')} />
              ))}
            </div>
            {[10, 8, 9, 6].map((w, i) => (
              <div key={i} className="flex gap-1.5 mb-1">
                <span className="h-1 flex-1 rounded-full bg-border" />
                <span className="h-1 flex-1 rounded-full bg-border" />
                {/* 动态宽度用 inline style（Tailwind 不编译运行时拼接的任意值类名） */}
                <span className="h-1 rounded-full bg-border" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        )
      case 'calc':
        return (
          <div>
            <div className={cn('h-4 rounded-md mb-1.5', a.tint)} />
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className={cn('aspect-square rounded bg-muted', i < 3 && a.tint)} />
              ))}
            </div>
          </div>
        )
      case 'greeting':
        return (
          <div className="relative h-full min-h-20 flex items-center justify-center">
            <span className={cn('size-1.5 rounded-full absolute top-1 left-3', a.bar)} />
            <span className={cn('size-1.5 rounded-full absolute top-4 left-8', a.bar)} />
            <span className={cn('size-1.5 rounded-full absolute bottom-2 right-4', a.bar)} />
            <span className={cn('size-1.5 rounded-full absolute bottom-5 right-10', a.bar)} />
            <span className={cn('h-10 w-24 rounded-xl flex items-center justify-center', a.tint)}>
              <span className={cn('h-3 w-10 rounded-full', a.bar)} />
            </span>
          </div>
        )
      case 'wheel':
        return (
          <div className="h-full min-h-20 flex items-center justify-center">
            <div className={cn('relative size-16 rounded-full', a.tint)}>
              <span className={cn('absolute inset-0 rounded-full', `ring-2 ring-inset`, a.bar)} />
              <span className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full', a.bar)} />
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute size-1 rounded-full bg-border"
                  style={{ transform: `rotate(${i * 45}deg) translateY(-22px)` }}
                />
              ))}
            </div>
          </div>
        )
      case 'dashboard':
        return (
          <div className="flex gap-2 h-full min-h-20">
            <div className="w-6 flex flex-col gap-1.5 py-0.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 rounded-full bg-muted" />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-6 rounded bg-muted" />
                ))}
              </div>
              <div className="flex items-end gap-1 flex-1">
                {['h-3', 'h-6', 'h-4', 'h-8', 'h-5', 'h-7'].map((h, i) => (
                  <span key={i} className={cn('w-2 rounded-t flex-1', a.bar, h)} />
                ))}
              </div>
            </div>
          </div>
        )
      case 'cards':
        return (
          <div>
            <span className={cn('block h-2 w-20 rounded-full mb-2', a.bar)} />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="flex-1 h-14 rounded-md bg-muted" />
              ))}
            </div>
          </div>
        )
    }
  }
}
