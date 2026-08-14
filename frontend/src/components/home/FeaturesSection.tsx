import { Rocket, Upload, Sparkles, User, type LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  { icon: Upload, title: '上传 HTML', desc: '现成的文件直接上架，无需改动' },
  { icon: Sparkles, title: 'AI 生成', desc: '描述需求自动生成——其中一条路径' },
  { icon: Rocket, title: '一键部署', desc: '秒级公网链接，即发即用随时分享' },
  { icon: User, title: '个人主页', desc: '部署成个人主页，展示你的工具与作品' },
]

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-20 bg-muted/40">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">一个 HTML 部署平台，不止于生成</h2>
          <p className="mt-3 text-muted-foreground">上传、生成、部署、分享，一站式完成</p>
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
