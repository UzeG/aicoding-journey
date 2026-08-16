import { useState } from 'react'
import { Save, Check, Loader2 } from 'lucide-react'
import { createPage, saveDraft } from '../../api/endpoints'
import { useLoginPrompt } from '../../hooks/useLoginPrompt'
import { useAuthStore } from '../../stores/auth'
import { useGenerationStore } from '../../stores/generation'
import { Button } from '../ui/button'
import SavePageDialog from './SavePageDialog'

interface Props {
  pageId: string | null
  disabled: boolean
}

export default function SaveDraftButton({ pageId, disabled }: Props) {
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSaved = useGenerationStore((s) => s.isSaved)
  const title = useGenerationStore((s) => s.title)
  const codeContent = useGenerationStore((s) => s.codeContent)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setSaved = useGenerationStore((s) => s.setSaved)
  const setTitle = useGenerationStore((s) => s.setTitle)
  const setPageId = useGenerationStore((s) => s.setPageId)
  const { askLogin, loginModal } = useLoginPrompt()

  const handleClick = () => {
    // 存草稿需要登录态：未登录弹窗提示，确认后去登录
    if (!isAuthenticated) {
      askLogin()
      return
    }
    if (isSaved) return
    setDialogOpen(true)
  }

  const handleConfirm = async (values: { title: string; page_id: string }) => {
    if (!codeContent) return
    setSaving(true)
    setError(null)
    try {
      // 无已有页面（如上传后未生成）：先建草稿再保存
      let targetId = pageId
      if (!targetId) {
        const created = await createPage({ title: values.title, html_content: codeContent })
        targetId = created.data.id
      }
      const res = await saveDraft(targetId, values.title, codeContent)
      // 已发布页面编辑存草稿 → 后端派生新草稿副本，pageId 切换到副本（后续发布/再保存针对副本）
      if (res.data.page_id && res.data.page_id !== targetId) {
        setPageId(res.data.page_id)
      } else if (!pageId) {
        setPageId(targetId)
      }
      setTitle(values.title)
      setSaved()
      setDialogOpen(false)
    } catch (err: any) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={disabled || saving || isSaved}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isSaved ? (
          <Check className="size-4" />
        ) : (
          <Save className="size-4" />
        )}
        <span className="hidden sm:inline">{saving ? '保存中...' : isSaved ? '已保存' : '保存草稿'}</span>
      </Button>

      <SavePageDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        defaultValues={{ title, page_id: '', tags: [] }}
        loading={saving}
        title="保存草稿"
        description="给页面起个名字，方便在列表中识别。"
        confirmLabel="保存"
      />

      {error && <p className="text-destructive text-sm mt-2">{error}</p>}

      {loginModal}
    </div>
  )
}
