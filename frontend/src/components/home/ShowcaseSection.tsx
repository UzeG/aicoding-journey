import { useEffect, useMemo, useRef, useState } from 'react'
import MockThumbnail from './MockThumbnail'
import Reveal from '../common/Reveal'
import { cn } from '../../lib/utils'
import { SHOWCASE_ITEMS } from '../../data/showcase'

/** 示例作品展示区：横向自动滚动的封面墙。悬停停止滚动并显示标题。 */
export default function ShowcaseSection() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // 自动横向滚动（循环：滚完一半后回绕）
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const tick = () => {
      const el = scrollerRef.current
      if (el && !pausedRef.current) {
        el.scrollLeft += 0.6
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const items = reduced ? SHOWCASE_ITEMS : [...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS]

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <Reveal className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">看看大家部署了什么</h2>
          <p className="mt-3 text-muted-foreground">工具、个人主页、任何单页应用——精选已部署页面 · 后续接入真实数据</p>
        </Reveal>
      </div>

      {/* 横向自动滚动封面墙（reduced-motion 时改手动横向滚动） */}
      <div
        ref={scrollerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className={cn(
          'w-full [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]',
          reduced ? 'overflow-x-auto' : 'overflow-hidden'
        )}
      >
        <div className="flex gap-5 px-6 w-max">
          {items.map((item, i) => (
            <div key={i} className="shrink-0 w-64">
              <div className="aspect-video rounded-lg border border-border overflow-hidden shadow-sm">
                <MockThumbnail variant={item.variant} accent={item.accent} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
