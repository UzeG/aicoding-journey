import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getAdminTrace } from '../../api/admin'
import type { AdminTraceDetail } from '../../types/admin'
import { cn, formatDateTime } from '../../lib/utils'

type Tab = 'overview' | 'step1' | 'step2' | 'html'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  )
}

export default function AdminTraceDetailView() {
  const { id } = useParams<{ id: string }>()
  const [trace, setTrace] = useState<AdminTraceDetail | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getAdminTrace(id)
      .then((res) => setTrace(res.data))
      .catch(() => setError('轨迹不存在'))
  }, [id])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!trace) return <LoadingSpinner />

  let libraries: string[] = []
  try {
    const parsed = trace.libraries ? (JSON.parse(trace.libraries) as string[]) : []
    libraries = Array.isArray(parsed) ? parsed : []
  } catch {
    libraries = []
  }

  let step1: string = trace.step1_output || ''
  try {
    if (trace.step1_output) step1 = JSON.stringify(JSON.parse(trace.step1_output), null, 2)
  } catch {
    step1 = trace.step1_output || ''
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'step1', label: 'Step 1 输出' },
    { key: 'step2', label: 'Step 2 原始流' },
    { key: 'html', label: '最终 HTML' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" asChild>
          <Link to="/admin/traces">
            <ArrowLeft className="size-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">生成轨迹详情</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="来源" value={trace.source === 'test' ? <Badge variant="secondary">测试</Badge> : <Badge>生成</Badge>} />
              <Field label="策略" value={trace.strategy === 'single_step' ? <Badge variant="secondary">单步</Badge> : <Badge>两步</Badge>} />
              <Field
                label="状态"
                value={trace.status === 'success' ? <Badge variant="success">成功</Badge> : <Badge variant="destructive">失败</Badge>}
              />
              <Field label="模型" value={<span className="font-mono text-xs">{trace.model || '-'}</span>} />
              <Field
                label="配置来源"
                value={trace.config_source === 'user' ? <Badge variant="secondary">用户配置</Badge> : <Badge variant="muted">平台默认</Badge>}
              />
              <Field label="API 地址" value={<span className="font-mono text-xs">{trace.base_url || '-'}</span>} />
              <Field label="Token" value={trace.tokens_used ?? '-'} />
              <Field label="耗时" value={trace.duration_ms != null ? `${trace.duration_ms}ms` : '-'} />
              <Field label="时间" value={formatDateTime(trace.created_at)} />
              <Field label="用户" value={<span className="font-mono text-xs">{trace.user_id || '-'}</span>} />
              <Field
                label="关联页面"
                value={
                  trace.page_fk ? (
                    <Link to={`/admin/pages/${trace.page_fk}`} className="font-mono text-xs text-primary underline">
                      {trace.page_fk}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">无（测试未落库）</span>
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">原始 Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{trace.prompt}</p>
            </CardContent>
          </Card>

          {trace.status === 'error' && trace.error_message && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive">错误信息</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive whitespace-pre-wrap break-words">{trace.error_message}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === 'step1' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">refined_prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{trace.refined_prompt || '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">选中的 CDN 库</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {libraries.length ? libraries.map((l) => <Badge key={l}>{l}</Badge>) : <span className="text-sm text-muted-foreground">-</span>}
            </CardContent>
          </Card>
          <pre className="rounded-lg border border-border p-4 text-xs text-foreground bg-muted/40 whitespace-pre-wrap break-words max-h-96 overflow-auto">
            {step1 || '(无)'}
          </pre>
        </div>
      )}

      {tab === 'step2' && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            HTML 过滤前的 LLM 原始流式全文——含 ```html 围栏、说明文字等（正式生成时这些内容会被丢弃）。
          </p>
          <pre className="rounded-lg border border-border p-4 text-xs text-foreground bg-muted/40 whitespace-pre-wrap break-words max-h-[36rem] overflow-auto">
            {trace.step2_raw || '(无原始流)'}
          </pre>
        </div>
      )}

      {tab === 'html' && (
        <pre className="rounded-lg border border-border p-4 text-xs text-foreground bg-muted/40 whitespace-pre-wrap break-words max-h-[36rem] overflow-auto">
          {trace.final_html || '(无)'}
        </pre>
      )}
    </div>
  )
}
