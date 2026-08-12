import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Loader2, PartyPopper, Clipboard, ExternalLink } from 'lucide-react'
import { publishPage } from '../../api/endpoints'
import { useAuthStore } from '../../stores/auth'
import { useGenerationStore } from '../../stores/generation'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import SavePageDialog from './SavePageDialog'
import type { PublishResult } from '../../types'

interface Props {
  pageId: string | null
  disabled: boolean
}

export default function PublishButton({ pageId, disabled }: Props) {
  const [publishing, setPublishing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const title = useGenerationStore((s) => s.title)
  const setTitle = useGenerationStore((s) => s.setTitle)
  const currentUserId = useAuthStore((s) => s.user?.user_id)
  const navigate = useNavigate()

  const handleClick = () => {
    if (!pageId) return
    setDialogOpen(true)
  }

  const handleConfirm = async (values: { title: string; page_id: string }) => {
    if (!pageId) return
    setPublishing(true)
    setError(null)
    try {
      const res = await publishPage(pageId, values.title, values.page_id || undefined)
      setTitle(values.title)
      setDialogOpen(false)
      setResult(res.data)
      window.open(res.data.url, '_blank')
      navigate(`/${currentUserId}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || '发布失败，请重试')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={disabled || publishing || !pageId}>
        {publishing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {publishing ? '发布中...' : '发布页面'}
      </Button>

      <SavePageDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        defaultValues={{ title, page_id: '' }}
        loading={publishing}
        title="发布页面"
        description="确认页面名称后发布到公网。"
        confirmLabel="发布"
        showPageId
      />

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <PartyPopper className="size-5 text-primary" />
              <DialogTitle>发布成功！</DialogTitle>
            </div>
            <DialogDescription>页面已上线，复制链接或打开访问。</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-2">页面链接</p>
            <a
              href={result?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary break-all text-sm font-mono hover:underline"
            >
              {result?.url}
            </a>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => result && navigator.clipboard.writeText(result.url)}>
              <Clipboard className="size-4" />
              复制链接
            </Button>
            <Button onClick={() => result && window.open(result.url, '_blank')}>
              <ExternalLink className="size-4" />
              打开页面
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  )
}
