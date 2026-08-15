import { useState } from 'react'
import { Save, Check, Loader2 } from 'lucide-react'
import { saveDraft } from '../../api/endpoints'
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
  const setSaved = useGenerationStore((s) => s.setSaved)
  const setTitle = useGenerationStore((s) => s.setTitle)
  const setPageId = useGenerationStore((s) => s.setPageId)

  const handleClick = () => {
    if (!pageId || isSaved) return
    setDialogOpen(true)
  }

  const handleConfirm = async (values: { title: string; page_id: string }) => {
    if (!pageId) return
    setSaving(true)
    setError(null)
    try {
      const res = await saveDraft(pageId, values.title, codeContent)
      // 已发布页面编辑存草稿 → 后端派生新草稿副本，pageId 切换到副本（后续发布/再保存针对副本）
      if (res.data.page_id && res.data.page_id !== pageId) {
        setPageId(res.data.page_id)
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
        disabled={disabled || saving || isSaved || !pageId}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isSaved ? (
          <Check className="size-4" />
        ) : (
          <Save className="size-4" />
        )}
        {saving ? '保存中...' : isSaved ? '已保存' : '保存草稿'}
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
    </div>
  )
}
