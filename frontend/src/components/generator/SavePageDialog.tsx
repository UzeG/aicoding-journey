import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
  // Extend here when adding more editable Page fields
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
}

export default function SavePageDialog({
  open,
  onClose,
  onConfirm,
  defaultValues,
  loading,
  title,
  description,
  confirmLabel,
}: Props) {
  const [values, setValues] = useState<PageFormValues>(defaultValues)

  useEffect(() => {
    if (open) {
      setValues(defaultValues)
    }
  }, [open, defaultValues])

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
              onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onConfirm(values) }}
            />
          </div>
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
