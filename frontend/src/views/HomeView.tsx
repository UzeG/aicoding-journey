import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Upload, Rocket, type LucideIcon } from 'lucide-react'
import { listPrompts } from '../api/endpoints'
import PromptInput from '../components/generator/PromptInput'
import PromptCard from '../components/home/PromptCard'
import PromptCardSkeleton from '../components/home/PromptCardSkeleton'
import ShowcaseSection from '../components/home/ShowcaseSection'
import HowItWorks from '../components/home/HowItWorks'
import FeaturesSection from '../components/home/FeaturesSection'
import HomeFooter from '../components/home/HomeFooter'
import { resolvePromptMeta } from '../lib/promptMeta'
import { useAuthStore } from '../stores/auth'
import type { RecommendedPrompt } from '../types'

interface HeroFeature {
  icon: LucideIcon
  title: string
  desc: string
}

const HERO_FEATURES: HeroFeature[] = [
  { icon: Sparkles, title: 'AI 流式生成', desc: '逐字渲染，实时可见' },
  { icon: Upload, title: '上传 HTML', desc: '本地文件直接上架' },
  { icon: Rocket, title: '一键发布', desc: '秒变公网链接' },
]

export default function HomeView() {
  const [prompts, setPrompts] = useState<RecommendedPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    listPrompts()
      .then((res) => setPrompts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleGenerate = (prompt: string) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/generator?prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <div>
      {/* Hero：源码纹理背景（像还没编译完的页面）+ 注释眉题 + 标签式标题 + <form> 输入标注 */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-168 rounded-full bg-primary/10 blur-3xl animate-glow-float" />
          <div className="absolute inset-x-0 top-0 h-px bg-border" />
          {/* 源码纹理（大屏展示，5% 透明度） */}
          <pre className="hidden lg:block absolute left-6 top-24 font-mono text-[11px] leading-[1.9] text-foreground/5 select-none">
{`<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <title>你的工具</title>
  </head>
  <body>
    <!-- 一句话 → HTML → 链接 -->
  </body>
</html>`}
          </pre>
          <pre className="hidden lg:block absolute right-8 bottom-16 text-right font-mono text-[11px] leading-[1.9] text-foreground/5 select-none">
{`<div class="tool">
  <h1>能用</h1>
</div>`}
          </pre>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center animate-fade-up">
          <p className="font-mono text-xs text-muted-foreground mb-6">
            &lt;!-- 把一句话编译成网页，一键发布成链接 --&gt;
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            一句话，
            <span className="block mt-1.5">
              <span className="font-mono text-primary">&lt;/</span>
              把网页造出来
              <span className="font-mono text-primary">&gt;</span>
            </span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            描述你想要的工具，AI 实时生成完整 HTML；也可以直接上传本地文件，
            一键发布为公网链接，任何人都能直接用。
          </p>

          <div className="max-w-2xl mx-auto">
            <p className="mb-2 px-1 text-left font-mono text-xs text-muted-foreground">
              &lt;form&gt; 描述你想造的工具
              <span aria-hidden className="inline-block w-[0.55em] h-[1.1em] translate-y-[0.18em] bg-primary animate-caret-blink" />
            </p>
            <div className="rounded-lg border border-border bg-card shadow-sm p-3">
              <PromptInput onGenerate={handleGenerate} disabled={false} textareaClassName="bg-transparent" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {HERO_FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
              >
                <span className="flex items-center justify-center size-9 rounded-md bg-primary/10 text-primary shrink-0">
                  <f.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 示例作品（静态假数据） */}
      <ShowcaseSection />

      {/* 推荐提示词 */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="font-mono text-xs text-muted-foreground mb-3">&lt;section&gt;</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">不知道想做什么？从这些开始</h2>
            <p className="mt-2 text-muted-foreground">点击卡片，用该描述开始生成</p>
          </div>
          {loading ? (
            <PromptCardSkeleton />
          ) : (
            prompts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map((p) => (
                  <PromptCard
                    key={p.id}
                    prompt={p.prompt}
                    onClick={handleGenerate}
                    {...resolvePromptMeta(p.prompt)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* 三步流程 */}
      <HowItWorks />

      {/* 平台特性 */}
      <FeaturesSection />

      {/* CTA + Footer（仅首页） */}
      <HomeFooter />
    </div>
  )
}
