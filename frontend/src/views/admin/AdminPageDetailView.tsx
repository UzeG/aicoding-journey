import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getAdminPage } from '../../api/admin'
import type { AdminPageDetail } from '../../types/admin'
import { formatDateTime, formatBytes } from '../../lib/utils'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  )
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <details className="group rounded-lg border border-border">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 list-none [&::-webkit-details-marker]:hidden">
        {title}
        <span className="ml-2 text-xs text-muted-foreground">{code.length.toLocaleString()} 字符</span>
      </summary>
      <pre className="max-h-96 overflow-auto px-4 py-3 text-xs text-foreground bg-muted/40 whitespace-pre-wrap break-words">{code}</pre>
    </details>
  )
}

export default function AdminPageDetailView() {
  const { pk } = useParams<{ pk: string }>()
  const [page, setPage] = useState<AdminPageDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pk) return
    getAdminPage(pk)
      .then((res) => setPage(res.data))
      .catch(() => setError('页面不存在'))
  }, [pk])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!page) return <LoadingSpinner />

  let step1: Record<string, unknown> | null = null
  try {
    step1 = page.step1_output ? (JSON.parse(page.step1_output) as Record<string, unknown>) : null
  } catch {
    step1 = null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" asChild>
          <Link to="/admin/pages">
            <ArrowLeft className="size-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{page.title || '未命名页面'}</h1>
        {page.is_published && page.page_id && (
          <Button size="sm" variant="outline" asChild>
            <a href={`/${page.user_id}/${page.page_id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              打开
            </a>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="ID" value={<span className="font-mono text-xs">{page.id}</span>} />
          <Field label="page_id" value={<span className="font-mono text-xs">{page.page_id || '-'}</span>} />
          <Field label="作者" value={page.user_nickname || page.user_id} />
          <Field
            label="状态"
            value={
              page.is_published ? (
                <Badge variant="success">已发布</Badge>
              ) : page.is_saved ? (
                <Badge variant="secondary">草稿</Badge>
              ) : (
                <Badge variant="muted">未保存</Badge>
              )
            }
          />
          <Field label="可见性" value={page.visibility} />
          <Field label="大小" value={formatBytes(page.file_size)} />
          <Field label="创建时间" value={formatDateTime(page.created_at)} />
          <Field label="更新时间" value={formatDateTime(page.updated_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt（refined_prompt）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{page.prompt || '-'}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {step1 && (
          <CodeBlock title="Step 1 输出（原始 JSON）" code={JSON.stringify(step1, null, 2)} />
        )}
        <CodeBlock title="最终 HTML" code={page.html_content || '(空)'} />
      </div>
    </div>
  )
}
