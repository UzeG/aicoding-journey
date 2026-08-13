import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Lightbulb, Rocket, Wand2, type LucideIcon } from 'lucide-react'
import { Badge } from '../components/ui/badge'
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
  { icon: Sparkles, title: '流式生成', desc: '逐字渲染实时可见' },
  { icon: Lightbulb, title: '推荐提示词', desc: '不知道写啥有模板' },
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
      {/* Hero：渐变光晕背景 + 渐变标题 + 卡片化输入框 + 特性 mini 卡片 */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-152 rounded-full bg-primary/20 blur-3xl animate-glow-float" />
          <div className="absolute -top-24 right-[8%] size-104 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="absolute -bottom-32 left-[2%] size-88 rounded-full bg-teal-300/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 backdrop-blur mb-6">
            <Wand2 className="size-3.5" />
            AI 驱动的 HTML 一键生成
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
            用自然语言
            <span className="block mt-1 bg-linear-to-r from-emerald-500 via-primary to-teal-500 bg-clip-text text-transparent">
              创造网页
            </span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            描述你想要什么，AI 帮你生成完整的 HTML 页面，一键发布为公网链接
          </p>

          <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card/80 backdrop-blur shadow-lg shadow-primary/10 p-3">
            <PromptInput onGenerate={handleGenerate} disabled={false} textareaClassName="bg-transparent" />
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {HERO_FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
              >
                <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
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
            <Badge variant="secondary">推荐提示词</Badge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold">不知道说什么？试试这些</h2>
            <p className="mt-2 text-muted-foreground">点击卡片即可用该描述开始生成</p>
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
