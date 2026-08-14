import { Upload, Rocket, Share2, type LucideIcon } from 'lucide-react'
import Reveal from '../common/Reveal'

interface Step {
  icon: LucideIcon
  title: string
  desc: string
}

const STEPS: Step[] = [
  { icon: Upload, title: '上传或生成', desc: '上传你造好的 HTML，或让 AI 按需求生成一个' },
  { icon: Rocket, title: '一键部署', desc: '秒级部署成公网链接，人人可直接访问使用' },
  { icon: Share2, title: '分享使用', desc: '把链接放进主页、分享出去，随时反复使用' },
]

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <Reveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">三步，从文件到上线</h2>
          <p className="mt-3 text-muted-foreground">上传或生成，都能快速部署</p>
        </Reveal>
        <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </Reveal>
      </div>
    </section>
  )
}
