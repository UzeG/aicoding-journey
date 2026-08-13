import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getAdminUser } from '../../api/admin'
import type { AdminUserDetail } from '../../types/admin'
import { formatDateTime } from '../../lib/utils'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  )
}

export default function AdminUserDetailView() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getAdminUser(id)
      .then((res) => setUser(res.data))
      .catch(() => setError('用户不存在'))
  }, [id])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!user) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" asChild>
          <Link to="/admin/users">
            <ArrowLeft className="size-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">用户详情</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="昵称" value={user.nickname || '-'} />
            <Field label="user_id" value={<span className="font-mono">@{user.user_id || '-'}</span>} />
            <Field label="手机号" value={<span className="font-mono">{user.phone}</span>} />
            <Field label="角色" value={user.is_admin ? <Badge>管理员</Badge> : <Badge variant="muted">普通</Badge>} />
            <Field label="注册时间" value={formatDateTime(user.created_at)} />
            <Field label="Token 余额" value={user.token_balance} />
            <Field label="简介" value={user.bio || '-'} />
            <Field label="页面数" value={user.pages_count} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">LLM 配置</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="模型" value={user.llm_model || '平台默认'} />
            <Field label="API 地址" value={user.llm_base_url || '平台默认'} />
            <Field label="API Key" value={user.has_api_key ? <Badge variant="success">已配置</Badge> : <Badge variant="muted">未配置</Badge>} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
