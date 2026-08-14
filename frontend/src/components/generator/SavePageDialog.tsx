import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { checkPageId } from '../../api/endpoints'
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

interface PageFormValues {
  title: string
  page_id: string
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
}

const PAGE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/

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
}: Props) {
  const [values, setValues] = useState<PageFormValues>(defaultValues)
  const [pageIdStatus, setPageIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (open) {
      setValues(defaultValues)
      setPageIdStatus('idle')
    }
  }, [open, defaultValues])

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
