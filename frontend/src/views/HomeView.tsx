import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTemplates } from '../api/endpoints'
import PromptInput from '../components/generator/PromptInput'
import TemplateCard from '../components/template/TemplateCard'
import { useAuthStore } from '../stores/auth'
import type { Template } from '../types'

export default function HomeView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    listTemplates().then((res) => setTemplates(res.data)).catch(() => {})
  }, [])

  const handleGenerate = (prompt: string) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/generator?prompt=${encodeURIComponent(prompt)}`)
  }

  const handleTemplateClick = (template: Template) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/generator?prompt=${encodeURIComponent(template.prompt_hint || template.name)}&templateId=${template.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          用自然语言<span className="text-emerald-600">创造网页</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          描述你想要什么，AI 帮你生成完整的 HTML 页面，一键发布为公网链接
        </p>
        <div className="max-w-2xl mx-auto">
          <PromptInput onGenerate={handleGenerate} disabled={false} />
        </div>
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-5">📋 快速开始 — 选择一个场景</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onClick={handleTemplateClick} />
          ))}
        </div>
      </div>
    </div>
  )
}
