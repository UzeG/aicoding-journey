import { Heart } from 'lucide-react'
import MockThumbnail from './MockThumbnail'
import { SHOWCASE_ITEMS } from '../../data/showcase'

/** 示例作品展示区（静态假数据，TODO 接入真实发布数据，见 src/data/showcase.ts 头部注释） */
export default function ShowcaseSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">看看大家部署了什么</h2>
          <p className="mt-3 text-muted-foreground">工具、个人主页、任何单页应用——精选已部署页面 · 后续接入真实数据</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOWCASE_ITEMS.map((item) => (
            <article
              key={item.id}
              className="group rounded-lg border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden"
            >
              <MockThumbnail variant={item.variant} accent={item.accent} />
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {/* 规格行：文件名 + 收藏数（工具的基本单元是一个 HTML 文件） */}
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between font-mono text-xs text-muted-foreground">
                  <span className="truncate">{item.file}</span>
                  <span className="shrink-0 flex items-center gap-1">
                    <Heart className="size-3" />
                    {item.likes}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
