import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deletePage, listPages } from '../api/endpoints'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📄 我的页面</h1>

      {deleteError && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{deleteError}</div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-4">还没有生成过页面</p>
          <button
            onClick={() => navigate('/')}
            className="text-emerald-600 hover:text-emerald-700 text-sm"
          >
            去首页开始创作 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{page.title || '未命名页面'}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>{new Date(page.created_at).toLocaleDateString('zh-CN')}</span>
                  {page.is_published && page.short_code && (
                    <a
                      href={`/p/${page.short_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline"
                    >
                      /p/{page.short_code}
                    </a>
                  )}
                  {page.is_published ? (
                    <span className="text-emerald-600">✅ 已发布</span>
                  ) : (
                    <span className="text-gray-400">📝 草稿</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => navigate(`/generator?pageId=${page.id}`)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => setDeleteTarget(page)}
                  className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
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
