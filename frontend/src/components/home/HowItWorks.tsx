import { Type, Zap, Rocket, type LucideIcon } from 'lucide-react'

interface Step {
  icon: LucideIcon
  title: string
  desc: string
}

const STEPS: Step[] = [
  { icon: Type, title: '描述想法', desc: '用一句话说清你要的工具，如「做一个话费计算器」' },
  { icon: Zap, title: '生成或上传', desc: 'AI 实时生成你的工具，或直接上传本地文件' },
  { icon: Rocket, title: '发布上架', desc: '一键生成公网链接，放进你的工具箱随时分享' },
]

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">三步，从想法到上架</h2>
          <p className="mt-3 text-muted-foreground">不需要会写代码，把工具说清楚就行</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <span className="absolute top-5 right-5 font-mono text-sm text-muted-foreground/60 select-none">
                {`0${i + 1}`}
              </span>
              <span className="flex items-center justify-center size-11 rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
