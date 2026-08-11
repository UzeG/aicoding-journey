import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Pencil, Trash2, CheckCircle2, CircleDashed, ExternalLink, CircleAlert, Plus } from 'lucide-react'
import { deletePage, listPages } from '../api/endpoints'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import type { PageItem } from '../types'

export default function MyPagesView() {
  const [pages, setPages] = useState<PageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<PageItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const navigate = useNavigate()

  const fetchPages = useCallback(async () => {
    try {
      const res = await listPages()
      setPages(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPages() }, [fetchPages])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await deletePage(deleteTarget.id)
      setPages((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || '删除失败，请重试')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <LoadingSpinner text="加载页面列表..." />

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="size-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">我的页面</h1>
        </div>
        <Button onClick={() => navigate('/')}>
          <Plus className="size-4" />
          新建页面
        </Button>
      </div>

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
          <CircleAlert className="size-4 shrink-0" />
          {deleteError}
        </div>
      )}

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText className="size-12 mb-4 opacity-40" />
            <p className="text-lg mb-4">还没有生成过页面</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              去首页开始创作
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
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
                    {page.is_published && page.short_code && (
                      <a
                        href={`/p/${page.short_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        /p/{page.short_code}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
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
