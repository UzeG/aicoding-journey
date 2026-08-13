import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Files, Globe, History, ScrollText, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getAdminStats } from '../../api/admin'
import type { AdminStats } from '../../types/admin'
import { cn } from '../../lib/utils'

export default function AdminOverviewView() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminStats()
      .then((res) => setStats(res.data))
      .catch(() => setError('加载概览数据失败'))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!stats) return <LoadingSpinner />

  const cards = [
    { label: '用户', value: stats.users_count, icon: Users, tone: '' },
    { label: '页面（含草稿）', value: stats.pages_count, icon: Files, tone: '' },
    { label: '已发布页面', value: stats.published_pages_count, icon: Globe, tone: '' },
    { label: '生成轨迹', value: stats.traces_count, icon: History, tone: '' },
    { label: '成功轨迹', value: stats.success_traces, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: '失败轨迹', value: stats.error_traces, icon: CircleAlert, tone: 'text-rose-600' },
    { label: '审计日志', value: stats.audit_count, icon: ScrollText, tone: '' },
    { label: '有 LLM 配置的用户', value: stats.users_with_llm_config, icon: Users, tone: '' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">后台概览</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <c.icon className={cn('size-4', c.tone)} />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-3xl font-bold text-foreground', c.tone)}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
