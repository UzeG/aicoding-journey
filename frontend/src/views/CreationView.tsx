import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleAlert, Loader2 } from 'lucide-react'
import CodePanel from '../components/creation/CodePanel'
import PreviewPanel from '../components/creation/PreviewPanel'
import PromptInput from '../components/creation/PromptInput'
import PublishButton from '../components/creation/PublishButton'
import SaveDraftButton from '../components/creation/SaveDraftButton'
import UploadToEditorButton from '../components/creation/UploadToEditorButton'
import DownloadButton from '../components/common/DownloadButton'
import { useSSE } from '../hooks/useSSE'
import { useLoginPrompt } from '../hooks/useLoginPrompt'
import { useUnsavedLeaveGuard } from '../hooks/useUnsavedLeaveGuard'
import { useGenerationStore } from '../stores/generation'
import { useAuthStore } from '../stores/auth'
import { getPage } from '../api/endpoints'

export default function CreationView() {
  const [searchParams] = useSearchParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const dirty = useGenerationStore((s) => s.dirty)
  const { askLogin, loginModal } = useLoginPrompt()
  const { leaveGuardModal } = useUnsavedLeaveGuard(dirty)
  const { isStreaming, codeContent, pageId, title, error, progressStep, progressMessage, setCode, setTitle, setTags } = useGenerationStore()
  const { startGeneration } = useSSE()
  const abortRef = useRef<AbortController | null>(null)
  // PC 端编辑器/预览分栏拖拽（移动端纵向不启用）
  const panelsRef = useRef<HTMLDivElement | null>(null)
  const [split, setSplit] = useState(50)

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const container = panelsRef.current
    if (!container) return
    const onMove = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0) return
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplit(Math.min(85, Math.max(15, pct)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])
  const initialPrompt = searchParams.get('prompt') || ''
  const editPageId = searchParams.get('pageId')
  const loadedRef = useRef(false)

  const handleGenerate = useCallback(async (prompt: string) => {
    // 生成需要登录态：未登录弹窗提示，确认后去登录
    if (!isAuthenticated) {
      askLogin()
      return
    }
    abortRef.current?.abort()
    const currentPageId = useGenerationStore.getState().pageId
    const controller = await startGeneration(prompt, currentPageId)
    if (controller) abortRef.current = controller
  }, [isAuthenticated, askLogin, startGeneration])

  // Load existing page for editing
  useEffect(() => {
    if (!editPageId || loadedRef.current) return
    loadedRef.current = true
    const loadPage = useGenerationStore.getState().loadPage
    getPage(editPageId).then((res) => {
      loadPage(editPageId, res.data.html_content, res.data.prompt || '', res.data.is_saved, res.data.title || '', res.data.tags || [])
    }).catch(() => {
      useGenerationStore.getState().setError('加载页面失败')
    })
  }, [editPageId])

  // Auto-generate if prompt is in URL
  // setTimeout(0) ensures only one call survives React StrictMode double-mount:
  // StrictMode runs cleanup (clearTimeout) synchronously before the second effect,
  // so the first timeout is cancelled and only the second fires.
  useEffect(() => {
    if (initialPrompt && !editPageId) {
      const timer = setTimeout(() => handleGenerate(initialPrompt), 0)
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 上传 HTML → 本地读取覆盖编辑器（无需登录）；后续发布/存草稿才需要登录
  const handleUploaded = useCallback(async (file: File) => {
    try {
      const content = await file.text()
      const name = (file.name || '').replace(/\.html?$/i, '') || '未命名页面'
      setCode(content)
      setTitle(name)
      setTags([])
      useGenerationStore.getState().setError('')
    } catch {
      useGenerationStore.getState().setError('文件读取失败，请重试')
    }
  }, [setCode, setTitle, setTags])

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Top bar：移动端纵向（PromptInput 全宽 + 按钮行），桌面横向 */}
      <div className="px-3 py-3 md:px-4 bg-card border-b border-border shrink-0 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 max-w-2xl w-full">
          <PromptInput onGenerate={handleGenerate} disabled={isStreaming} initialValue={!isStreaming ? initialPrompt : undefined} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <UploadToEditorButton disabled={isStreaming} onLoaded={handleUploaded} />
          <SaveDraftButton pageId={pageId} disabled={isStreaming || !codeContent} />
          <DownloadButton
            variant="outline"
            size="default"
            fileName={title}
            getContent={() => codeContent}
            disabled={isStreaming || !codeContent}
          />
          <PublishButton pageId={pageId} disabled={isStreaming || !codeContent} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          <CircleAlert className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Progress indicator（运行中态 = 标签色，强调此刻正在产生标记） */}
      {isStreaming && progressStep && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-live/10 border-b border-live/20 text-sm text-live">
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{progressMessage}</span>
          <span className="font-mono text-xs text-live/70 ml-auto">
            {progressStep === 'understand' ? '步骤 1/2' : '步骤 2/2'}
          </span>
        </div>
      )}

      {/* Split panels：PC 端可拖拽分栏（编辑器 flex-basis = --split），移动端纵向 */}
      <div
        ref={panelsRef}
        style={{ '--split': `${split}%` } as React.CSSProperties}
        className="flex-1 flex flex-col md:flex-row overflow-hidden"
      >
        <div className="min-w-0 overflow-hidden flex-1 md:grow-0 md:shrink-0 md:basis-[var(--split)]">
          <CodePanel code={codeContent} isStreaming={isStreaming} onChange={setCode} />
        </div>
        {/* 拖拽分隔线：鼠标悬停/拖动时 col-resize 光标 */}
        <div
          onPointerDown={startResize}
          className="hidden md:block shrink-0 w-1.5 bg-border/60 hover:bg-primary/40 active:bg-primary/40 transition-colors cursor-col-resize select-none"
          aria-label="拖拽调整编辑区宽度"
        />
        <div className="min-w-0 overflow-hidden flex-1">
          <PreviewPanel htmlContent={codeContent} isStreaming={isStreaming} />
        </div>
      </div>

      {loginModal}
      {leaveGuardModal}
    </div>
  )
}
