import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Lightbulb, ArrowRight, Wand2 } from 'lucide-react'
import { listPrompts } from '../api/endpoints'
import PromptInput from '../components/generator/PromptInput'
import PromptCard from '../components/home/PromptCard'
import { useAuthStore } from '../stores/auth'
import type { RecommendedPrompt } from '../types'

export default function HomeView() {
  const [prompts, setPrompts] = useState<RecommendedPrompt[]>([])
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    listPrompts().then((res) => setPrompts(res.data)).catch(() => {})
  }, [])

  const handleGenerate = (prompt: string) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/generator?prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-6">
          <Wand2 className="size-3.5" />
          AI 驱动的 HTML 一键生成
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
          用自然语言
          <span className="text-primary">创造网页</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          描述你想要什么，AI 帮你生成完整的 HTML 页面，一键发布为公网链接
        </p>
        <div className="max-w-2xl mx-auto">
          <PromptInput onGenerate={handleGenerate} disabled={false} />
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" /> 流式生成
          </span>
          <span className="flex items-center gap-1.5">
            <Lightbulb className="size-4 text-primary" /> 推荐提示词
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowRight className="size-4 text-primary" /> 一键发布
          </span>
        </div>
      </div>

      {/* Recommended Prompts */}
      {prompts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">不知道说什么？试试这些</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((p) => (
              <PromptCard key={p.id} prompt={p.prompt} onClick={handleGenerate} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
