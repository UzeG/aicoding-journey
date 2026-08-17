import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Check, X, Plus } from 'lucide-react'
import { checkPageId } from '../../api/endpoints'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

interface PageFormValues {
  title: string
  page_id: string
  tags: string[]
  description: string
}

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (values: PageFormValues) => void
  defaultValues: PageFormValues
  loading: boolean
  title: string
  description: string
  confirmLabel: string
  showPageId?: boolean
  showTags?: boolean
}

const PAGE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/
const MAX_TAGS = 5
const MAX_TAG_LEN = 20

export default function SavePageDialog({
  open,
  onClose,
  onConfirm,
  defaultValues,
  loading,
  title,
  description,
  confirmLabel,
  showPageId = false,
  showTags = false,
}: Props) {
  const [values, setValues] = useState<PageFormValues>(defaultValues)
  const [tagInput, setTagInput] = useState('')
  const [pageIdStatus, setPageIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (open) {
      setValues(defaultValues)
      setTagInput('')
      setPageIdStatus('idle')
    }
  }, [open, defaultValues])

  const addTag = useCallback(() => {
    const t = tagInput.trim().slice(0, MAX_TAG_LEN)
    if (!t) return
    setValues((prev) => {
      if (prev.tags.length >= MAX_TAGS || prev.tags.includes(t)) return prev
      return { ...prev, tags: [...prev.tags, t] }
    })
    setTagInput('')
  }, [tagInput])

  const handleTagInputChange = useCallback((raw: string) => {
    // 逗号（中英文）即分隔输入，一次性加入多个
    if (raw.includes(',') || raw.includes('，')) {
      const parts = raw.split(/[,，]/).map((s) => s.trim().slice(0, MAX_TAG_LEN)).filter(Boolean)
      setValues((prev) => {
        const next = [...prev.tags]
        for (const p of parts) {
          if (p && !next.includes(p) && next.length < MAX_TAGS) next.push(p)
        }
        return { ...prev, tags: next }
      })
      setTagInput('')
    } else {
      setTagInput(raw.slice(0, MAX_TAG_LEN))
    }
  }, [])

  const removeTag = useCallback((t: string) => {
    setValues((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }))
  }, [])

  const validatePageId = useCallback(async (val: string) => {
    if (!val) {
      setPageIdStatus('idle')
      return
    }
    if (!PAGE_ID_PATTERN.test(val)) {
      setPageIdStatus('invalid')
      return
    }
    setPageIdStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkPageId(val)
        setPageIdStatus(res.data.available ? 'available' : 'taken')
      } catch {
        setPageIdStatus('idle')
      }
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const canSubmit = values.title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">页面名称</Label>
            <Input
              id="page-title"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="输入页面名称（4-10字）"
              maxLength={200}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-desc">描述（可选）</Label>
            <Textarea
              id="page-desc"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="一句话介绍这个项目..."
              maxLength={500}
              rows={3}
              disabled={loading}
            />
          </div>

          {showPageId && (
            <div className="space-y-2">
              <Label htmlFor="page-id">页面 ID（可选）</Label>
              <div className="relative">
                <Input
                  id="page-id"
                  value={values.page_id}
                  onChange={(e) => { setValues((v) => ({ ...v, page_id: e.target.value })); validatePageId(e.target.value) }}
                  maxLength={50}
                  placeholder="留空则自动生成，部署后可在页面管理中修改"
                  disabled={loading}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onConfirm(values) }}
                />
                {pageIdStatus === 'checking' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                {pageIdStatus === 'available' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-success" />}
                {pageIdStatus === 'taken' && <X className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-destructive" />}
              </div>
              <p className="text-xs text-muted-foreground">
                {pageIdStatus === 'idle' && '字母、数字、连字符、下划线，用于页面链接'}
                {pageIdStatus === 'checking' && '正在检查...'}
                {pageIdStatus === 'available' && '✅ 该 ID 可用'}
                {pageIdStatus === 'taken' && '❌ 已被占用，请换一个'}
                {pageIdStatus === 'invalid' && '格式：字母、数字、连字符、下划线'}
              </p>
            </div>
          )}

          {showTags && (
            <div className="space-y-2">
              <Label htmlFor="page-tags">标签（可选）</Label>
              <div className="flex gap-2">
                <Input
                  id="page-tags"
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  maxLength={MAX_TAG_LEN}
                  placeholder="输入标签，回车或逗号添加"
                  disabled={loading || values.tags.length >= MAX_TAGS}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag} disabled={loading || !tagInput.trim() || values.tags.length >= MAX_TAGS}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {values.tags.length}/{MAX_TAGS} 个，每个最多 {MAX_TAG_LEN} 字
              </p>
              <div className="flex flex-wrap gap-1.5 min-h-8">
                {values.tags.length === 0 && (
                  <span className="text-xs text-muted-foreground py-1">暂无标签</span>
                )}
                {values.tags.map((t) => (
                  <Badge key={t} variant="muted" className="gap-1 text-xs">
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      disabled={loading}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                      aria-label={`删除标签 ${t}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={() => onConfirm(values)} disabled={!canSubmit || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
