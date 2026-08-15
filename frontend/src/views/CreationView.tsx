import { useCallback, useEffect, useRef } from 'react'
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
import { useGenerationStore } from '../stores/generation'
import { useAuthStore } from '../stores/auth'
import { getPage } from '../api/endpoints'

export default function CreationView() {
  const [searchParams] = useSearchParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { askLogin, loginModal } = useLoginPrompt()
  const { isStreaming, codeContent, pageId, title, error, progressStep, progressMessage, setCode, setTitle, setTags } = useGenerationStore()
  const { startGeneration } = useSSE()
  const abortRef = useRef<AbortController | null>(null)
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
      {/* Top bar */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center gap-4">
        <div className="flex-1 max-w-2xl">
          <PromptInput onGenerate={handleGenerate} disabled={isStreaming} initialValue={!isStreaming ? initialPrompt : undefined} />
        </div>
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

      {/* Split panels */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 border-r border-border overflow-hidden">
          <CodePanel code={codeContent} isStreaming={isStreaming} onChange={setCode} />
        </div>
        <div className="flex-1 overflow-hidden">
          <PreviewPanel htmlContent={codeContent} isStreaming={isStreaming} />
        </div>
      </div>

      {loginModal}
    </div>
  )
}
