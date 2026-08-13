import { Badge } from '../ui/badge'
import MockThumbnail from './MockThumbnail'
import { SHOWCASE_ITEMS } from '../../data/showcase'

/** 示例作品展示区（静态假数据，TODO 接入真实发布数据，见 src/data/showcase.ts 头部注释） */
export default function ShowcaseSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="secondary">示例作品</Badge>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold">看看大家用自然语言做出了什么</h2>
          <p className="mt-2 text-muted-foreground">精选静态示例 · 后续将接入真实发布数据</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOWCASE_ITEMS.map((item) => (
            <article
              key={item.id}
              className="group rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden"
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
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
