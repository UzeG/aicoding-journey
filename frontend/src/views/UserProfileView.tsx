import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Pencil, Trash2, CheckCircle2, CircleDashed, ExternalLink, CircleAlert, Plus, User } from 'lucide-react'
import { deletePage, getUserProfile } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import type { PageItem, UserProfile } from '../types'

const BACKEND_URL = import.meta.env.VITE_PUBLIC_BASE_URL || 'http://localhost:8000'

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PageItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  const isOwnProfile = currentUser?.user_id?.toLowerCase() === userId?.toLowerCase()

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    try {
      const res = await getUserProfile(userId)
      setProfile(res.data)
    } catch (err: any) {
      if (err.response?.status === 404) setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await deletePage(deleteTarget.id)
      setProfile((prev) => prev ? { ...prev, pages: prev.pages.filter((p) => p.id !== deleteTarget.id) } : prev)
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || '删除失败，请重试')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <LoadingSpinner text="加载用户主页..." />

  if (notFound || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="size-16 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h1 className="text-2xl font-bold mb-2">用户不存在</h1>
        <p className="text-muted-foreground mb-6">未找到用户 @{userId}</p>
        <Button variant="outline" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile.user.nickname || profile.user.user_id}</h1>
            <p className="text-sm text-muted-foreground">@{profile.user.user_id}</p>
          </div>
        </div>
        {isOwnProfile && (
          <Button onClick={() => navigate('/')}>
            <Plus className="size-4" />
            新建页面
          </Button>
        )}
      </div>

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
          <CircleAlert className="size-4 shrink-0" />
          {deleteError}
        </div>
      )}

      {profile.pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText className="size-12 mb-4 opacity-40" />
            <p className="text-lg mb-4">
              {isOwnProfile ? '还没有生成过页面' : '还没有发布过页面'}
            </p>
            {isOwnProfile && (
              <Button variant="outline" onClick={() => navigate('/')}>
                去首页开始创作
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profile.pages.map((page) => (
            <Card key={page.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{page.title || '未命名页面'}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{new Date(page.created_at).toLocaleDateString('zh-CN')}</span>
                    {page.is_published ? (
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" />
                        已发布
                      </Badge>
                    ) : (
                      <Badge variant="muted">
                        <CircleDashed className="size-3" />
                        草稿
                      </Badge>
                    )}
                    {page.is_published && page.page_id && (
                      <a
                        href={`${BACKEND_URL}/${profile.user.user_id}/${page.page_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        /{profile.user.user_id}/{page.page_id}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
                {isOwnProfile && (
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/generator?pageId=${page.id}`)}
                    >
                      <Pencil className="size-4" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(page)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除页面"
        message={`确定要删除「${deleteTarget?.title || '未命名页面'}」吗？已发布的链接将失效。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
