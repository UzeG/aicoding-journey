import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Upload, Rocket, type LucideIcon } from 'lucide-react'
import { listPrompts } from '../api/endpoints'
import HeroInput, { type HeroMode } from '../components/home/HeroInput'
import HeroPreview from '../components/home/HeroPreview'
import Reveal from '../components/common/Reveal'
import PromptCard from '../components/home/PromptCard'
import PromptCardSkeleton from '../components/home/PromptCardSkeleton'
import ShowcaseSection from '../components/home/ShowcaseSection'
import FeaturesSection from '../components/home/FeaturesSection'
import HomeFooter from '../components/home/HomeFooter'
import { resolvePromptMeta } from '../lib/promptMeta'
import { useAuthStore } from '../stores/auth'
import type { RecommendedPrompt } from '../types'

interface HeroFeature {
  icon: LucideIcon
  title: string
}

const HERO_FEATURES: HeroFeature[] = [
  { icon: Upload, title: '上传 HTML' },
  { icon: Sparkles, title: 'AI 生成' },
  { icon: Rocket, title: '一键部署' },
]

// three 随 HeroBackground 懒加载，不进入主包
const HeroBackground = lazy(() => import('../components/home/HeroBackground'))

export default function HomeView() {
  const [prompts, setPrompts] = useState<RecommendedPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [livePrompt, setLivePrompt] = useState('')
  const [mode, setMode] = useState<HeroMode>('generate')
  const [uploadName, setUploadName] = useState('')
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
    navigate(`/creation?prompt=${encodeURIComponent(prompt)}`)
  }

  const handleUploaded = (name: string) => {
    setMode('upload')
    setUploadName(name)
  }

  return (
    <div>
      {/* Hero：左文案+输入，右编译面板（产品在首页上跑起来）。
          -mt-(--header-height) 顶到视口顶：hero 背景延伸到悬浮 header 之下、占满一整屏 */}
      <section className="relative overflow-hidden -mt-(--header-height) min-h-svh py-12 md:py-0 md:flex md:items-center">
        {/* 背景：稀疏细点 + 鼠标视差/推开 + 点击扩散圆环（懒加载 three） */}
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          <Suspense fallback={null}>
            <HeroBackground />
          </Suspense>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-up">
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.08] mb-5">
              上传或生成，
              <span className="block text-primary">一键部署上线</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
              你的 HTML 可以是工具、个人主页，任何单页应用——一键部署成公网链接，
              随时分享、反复使用。
            </p>

            <HeroInput
              mode={mode}
              onModeChange={setMode}
              onGenerate={handleGenerate}
              onPromptChange={setLivePrompt}
              onUploaded={handleUploaded}
            />

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {HERO_FEATURES.map((f) => (
                <span key={f.title} className="flex items-center gap-1.5">
                  <f.icon className="size-4 text-primary" />
                  {f.title}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-fade-up">
            <HeroPreview prompt={livePrompt} mode={mode} fileName={uploadName} />
          </div>
        </div>
      </section>

      {/* 示例作品（静态假数据） */}
      <ShowcaseSection />

      {/* 推荐提示词 */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">不知道造什么？从这些开始</h2>
            <p className="mt-3 text-muted-foreground">点击卡片，让 AI 按需求生成一个</p>
          </Reveal>
          {loading ? (
            <PromptCardSkeleton />
          ) : (
            prompts.length > 0 && (
              <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map((p) => (
                  <PromptCard
                    key={p.id}
                    prompt={p.prompt}
                    onClick={handleGenerate}
                    {...resolvePromptMeta(p.prompt)}
                  />
                ))}
              </Reveal>
            )
          )}
        </div>
      </section>

      {/* 平台特性 */}
      <FeaturesSection />

      {/* CTA + Footer（仅首页） */}
      <HomeFooter />
    </div>
  )
}
