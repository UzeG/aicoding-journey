import { useEffect, useState } from 'react'
import { Check, Copy, FileCode2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getAdminSystemPrompts } from '../../api/admin'
import type { AdminSystemPrompts } from '../../types/admin'

function PromptBlock({ title, description, code }: { title: string; description: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div>
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileCode2 className="size-4 text-primary" />
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-xs text-foreground bg-muted/40 whitespace-pre-wrap break-words">{code}</pre>
    </div>
  )
}

export default function AdminSystemPromptsView() {
  const [prompts, setPrompts] = useState<AdminSystemPrompts | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminSystemPrompts()
      .then((res) => setPrompts(res.data))
      .catch(() => setError('加载失败'))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!prompts) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">系统提示词</h1>
      <p className="text-sm text-muted-foreground">
        这里展示的是当前 <code className="bg-muted px-1 rounded">system_prompt.py</code> 中的两份提示词，供对照生成轨迹迭代。
        Step 2 提示词会根据选中的 CDN 库注入不同内容，此处为基础版本。
      </p>

      <PromptBlock
        title="Step 1 — 理解需求 + 选库"
        description="非流式调用，输出 { refined_prompt, libraries }"
        code={prompts.step1}
      />
      <PromptBlock
        title="Step 2 — 生成 HTML"
        description="流式调用，按选中库注入使用规范与安全红线"
        code={prompts.step2}
      />
    </div>
  )
}
