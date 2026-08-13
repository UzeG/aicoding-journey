import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getAdminLLMConfigs } from '../../api/admin'
import type { AdminLLMConfigs, AdminLLMConfigUser } from '../../types/admin'

export default function AdminLLMConfigsView() {
  const [data, setData] = useState<AdminLLMConfigs | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminLLMConfigs()
      .then((res) => setData(res.data))
      .catch(() => setError('加载失败'))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">LLM 配置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="size-4 text-primary" />
            平台默认（backend/.env）
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">模型</span>
            <span className="text-sm font-mono text-foreground">{data.platform.model || '-'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">API 地址</span>
            <span className="text-sm font-mono text-foreground break-all">{data.platform.base_url || '-'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">API Key</span>
            <span>{data.platform.has_api_key ? <Badge variant="success">已配置</Badge> : <Badge variant="muted">未配置</Badge>}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">有自定义配置的用户（优先级高于平台默认）</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<AdminLLMConfigUser>
            rows={data.users}
            keyFn={(u) => u.phone}
            emptyText="没有用户配置自定义 LLM"
            columns={[
              {
                key: 'user',
                header: '用户',
                render: (u) => (
                  <div>
                    <p className="font-medium text-foreground">{u.nickname || '未命名'}</p>
                    <p className="text-xs text-muted-foreground">@{u.user_id || '-'}</p>
                  </div>
                ),
              },
              { key: 'phone', header: '手机号', render: (u) => <span className="font-mono text-xs">{u.phone}</span> },
              { key: 'model', header: '模型', render: (u) => <span className="font-mono text-xs">{u.model || '-'}</span> },
              {
                key: 'base_url',
                header: 'API 地址',
                render: (u) => <span className="font-mono text-xs break-all">{u.base_url || '-'}</span>,
              },
              {
                key: 'key',
                header: 'API Key',
                render: (u) => (u.has_api_key ? <Badge variant="success">已配置</Badge> : <Badge variant="muted">未配置</Badge>),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
