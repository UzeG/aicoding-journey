import { Zap, Shield, Rocket, Pencil, type LucideIcon } from 'lucide-react'
import { Badge } from '../ui/badge'

interface Feature {
  icon: LucideIcon
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  { icon: Zap, title: '流式生成', desc: 'SSE 逐字流式渲染，实时看到代码与效果' },
  { icon: Shield, title: '安全扫描', desc: '发布前自动扫描 HTML，拦截恶意脚本风险' },
  { icon: Rocket, title: '一键发布', desc: '秒级生成公网链接，即发即用随时分享' },
  { icon: Pencil, title: '自由编辑', desc: '生成后可继续重生成优化，反复迭代' },
]

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-20 bg-muted/40">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="secondary">平台特性</Badge>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold">不止是生成，而是一个完整工作流</h2>
          <p className="mt-2 text-muted-foreground">从想法到可分享的链接，一站式完成</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
