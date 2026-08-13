import { Type, Zap, Rocket, type LucideIcon } from 'lucide-react'
import { Badge } from '../ui/badge'

interface Step {
  icon: LucideIcon
  title: string
  desc: string
}

const STEPS: Step[] = [
  { icon: Type, title: '输入描述', desc: '用自然语言描述你想要的页面，如「做一个中秋贺卡」' },
  { icon: Zap, title: 'AI 流式生成', desc: '边生成边预览，完整 HTML 实时流式渲染' },
  { icon: Rocket, title: '一键发布', desc: '生成公网链接，随时分享给任何人' },
]

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="secondary">使用流程</Badge>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold">三步，从想法到上线</h2>
          <p className="mt-2 text-muted-foreground">不需要会写代码，把想法说清楚就行</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <span className="absolute top-5 right-5 text-4xl font-bold text-muted/50 select-none">{`0${i + 1}`}</span>
              <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary">
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
