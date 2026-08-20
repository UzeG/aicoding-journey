import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import Reveal from '../common/Reveal'
import { getGallery } from '../../api/endpoints'
import type { GalleryItem } from '../../types'

/** 示例作品展示区：真实数据（最热 10 条）横向自动滚动封面墙（纯 CSS transform 动画，
    iOS Safari 稳定，不受 scrollLeft/requestAnimationFrame 节流影响）。hover 暂停。 */
export default function ShowcaseSection() {
  const [items, setItems] = useState<GalleryItem[]>([])

  // 拉最热 10 条
  useEffect(() => {
    getGallery({ sort: 'hot', page: 1, page_size: 10 })
      .then((res) => setItems(res.data.items))
      .catch(() => setItems([]))
  }, [])

  // 复制两份实现无缝循环（动画 translateX 0 → -50% 恰为一份宽）
  const loopItems = [...items, ...items]

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <Reveal className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">看看大家部署了什么</h2>
          <p className="mt-3 text-muted-foreground">最热 10 个作品 · 横向滚动查看</p>
        </Reveal>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-12">暂无作品，快去创作吧</p>
      ) : (
        <div className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
          <div className="flex gap-5 px-6 w-max animate-[showcase-scroll_30s_linear_infinite] hover:[animation-play-state:paused]">
            {loopItems.map((item, i) => (
              <div key={`${item.id}-${i}`} className="shrink-0 w-56">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video rounded-lg overflow-hidden border border-border bg-muted"
                >
                  {item.cover_url ? (
                    <img
                      src={item.cover_url}
                      alt={item.title || '作品封面'}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <FileText className="size-7 opacity-40" />
                    </div>
                  )}
                </a>
                <div className="mt-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-medium text-sm text-foreground truncate hover:text-primary"
                  >
                    {item.title || '未命名页面'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
