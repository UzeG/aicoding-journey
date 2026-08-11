import { useState } from 'react'
import { Save, Check, Loader2 } from 'lucide-react'
import { saveDraft } from '../../api/endpoints'
import { useGenerationStore } from '../../stores/generation'
import { Button } from '../ui/button'

interface Props {
  pageId: string | null
  disabled: boolean
}

export default function SaveDraftButton({ pageId, disabled }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSaved = useGenerationStore((s) => s.isSaved)
  const setSaved = useGenerationStore((s) => s.setSaved)

  const handleSave = async () => {
    if (!pageId || isSaved) return
    setSaving(true)
    setError(null)
    try {
      await saveDraft(pageId)
      setSaved()
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
        onClick={handleSave}
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

      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  )
}
