import { Zap, Shield, Rocket, Database, type LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  { icon: Zap, title: '流式生成', desc: 'SSE 逐字渲染，实时看到代码与效果' },
  { icon: Shield, title: '安全扫描', desc: '发布前自动扫描 HTML，拦截恶意脚本风险' },
  { icon: Rocket, title: '一键发布', desc: '秒级生成公网链接，即发即用随时分享' },
  { icon: Database, title: '数据增强', desc: '规划支持自定义数据库，让工具真正强大' },
]

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-20 bg-muted/40">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          {/* 特性是一组「术语-描述」对，语义上是 <dl> */}
          <p className="font-mono text-xs text-muted-foreground mb-3">&lt;dl&gt;</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">一个完整的工作流，从想法到上架</h2>
          <p className="mt-2 text-muted-foreground">生成、上传、发布、迭代，一站式完成</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <span className="flex items-center justify-center size-11 rounded-md bg-primary/10 text-primary">
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
