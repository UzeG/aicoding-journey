import { useState } from 'react'
import { Upload, Loader2, PartyPopper, Clipboard, Check, ExternalLink } from 'lucide-react'
import { createPage, publishPage } from '../../api/endpoints'
import { useLoginPrompt } from '../../hooks/useLoginPrompt'
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
  const [copied, setCopied] = useState(false)
  const title = useGenerationStore((s) => s.title)
  const setTitle = useGenerationStore((s) => s.setTitle)
  const tags = useGenerationStore((s) => s.tags)
  const codeContent = useGenerationStore((s) => s.codeContent)
  const isEdit = useGenerationStore((s) => s.isEdit)
  const description = useGenerationStore((s) => s.description)
  const publicPageId = useGenerationStore((s) => s.publicPageId)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { askLogin, loginModal } = useLoginPrompt()

  const copyLink = async () => {
    if (!result) return
    const url = window.location.origin + result.url
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleClick = () => {
    // 发布需要登录态：未登录弹窗提示，确认后去登录
    if (!isAuthenticated) {
      askLogin()
      return
    }
    setDialogOpen(true)
  }

  const handleConfirm = async (values: { title: string; page_id: string; tags: string[]; description: string }) => {
    if (!codeContent) return
    setPublishing(true)
    setError(null)
    try {
      // 无已有页面（如上传后未生成）：先建草稿再发布
      let targetId = pageId
      if (!targetId) {
        const created = await createPage({ title: values.title, html_content: codeContent, description: values.description })
        targetId = created.data.id
      }
      const res = await publishPage(targetId, values.title, values.page_id || undefined, values.tags, codeContent, values.description)
      setTitle(values.title)
      setDialogOpen(false)
      setResult(res.data) // 仅展示发布成功弹窗；不清空编辑器、不打开发布页、不跳个人页
    } catch (err: any) {
      setError(err.response?.data?.detail || '部署失败，请重试')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={disabled || publishing}>
        {publishing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        <span className="hidden sm:inline">{publishing ? (isEdit ? '保存中...' : '部署中...') : (isEdit ? '保存页面' : '部署页面')}</span>
      </Button>

      <SavePageDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        defaultValues={{ title, page_id: publicPageId || '', tags, description }}
        loading={publishing}
        title={isEdit ? '保存页面' : '部署页面'}
        description={isEdit ? '确认页面信息后保存。' : '确认页面名称后部署到公网。'}
        confirmLabel={isEdit ? '保存' : '部署'}
        showPageId
        showTags
      />

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <PartyPopper className="size-5 text-primary" />
              <DialogTitle>{isEdit ? '保存成功！' : '部署成功！'}</DialogTitle>
            </div>
            <DialogDescription>页面已上线，扫描二维码或点击链接以访问。</DialogDescription>
          </DialogHeader>
          {result && (
            <img
              src={`/api/pages/${result.id}/qrcode?url=${encodeURIComponent(window.location.origin + result.url)}`}
              alt="发布页二维码"
              className="w-36 h-36 mx-auto mb-4 block rounded-lg bg-white p-1.5"
            />
          )}
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
            <Button variant="outline" onClick={copyLink} disabled={copied}>
              {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
              {copied ? '已复制' : '复制链接'}
            </Button>
            <Button onClick={() => result && window.open(result.url, '_blank')}>
              <ExternalLink className="size-4" />
              打开页面
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <p className="text-destructive text-sm mt-2">{error}</p>}

      {loginModal}
    </div>
  )
}
