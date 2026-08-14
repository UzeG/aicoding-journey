import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleAlert, Loader2 } from 'lucide-react'
import CodePanel from '../components/generator/CodePanel'
import PreviewPanel from '../components/generator/PreviewPanel'
import PromptInput from '../components/generator/PromptInput'
import PublishButton from '../components/generator/PublishButton'
import SaveDraftButton from '../components/generator/SaveDraftButton'
import DownloadButton from '../components/common/DownloadButton'
import { useSSE } from '../hooks/useSSE'
import { useGenerationStore } from '../stores/generation'
import { getPage } from '../api/endpoints'

export default function GeneratorView() {
  const [searchParams] = useSearchParams()
  const { isStreaming, codeContent, pageId, title, error, progressStep, progressMessage } = useGenerationStore()
  const { startGeneration } = useSSE()
  const abortRef = useRef<AbortController | null>(null)
  const initialPrompt = searchParams.get('prompt') || ''
  const editPageId = searchParams.get('pageId')
  const loadedRef = useRef(false)

  const handleGenerate = useCallback(async (prompt: string) => {
    abortRef.current?.abort()
    const currentPageId = useGenerationStore.getState().pageId
    const controller = await startGeneration(prompt, currentPageId)
    if (controller) abortRef.current = controller
  }, [startGeneration])

  // Load existing page for editing
  useEffect(() => {
    if (!editPageId || loadedRef.current) return
    loadedRef.current = true
    const loadPage = useGenerationStore.getState().loadPage
    getPage(editPageId).then((res) => {
      loadPage(editPageId, res.data.html_content, res.data.prompt || '', res.data.is_saved, res.data.title || '')
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

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center gap-4">
        <div className="flex-1 max-w-2xl">
          <PromptInput onGenerate={handleGenerate} disabled={isStreaming} initialValue={!isStreaming ? initialPrompt : undefined} />
        </div>
        <SaveDraftButton pageId={pageId} disabled={isStreaming || !codeContent || !pageId} />
        <DownloadButton
          variant="outline"
          size="default"
          fileName={title}
          getContent={() => codeContent}
          disabled={isStreaming || !codeContent}
        />
        <PublishButton pageId={pageId} disabled={isStreaming || !codeContent || !pageId} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          <CircleAlert className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Progress indicator */}
      {isStreaming && progressStep && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50/50 border-b border-emerald-100 text-sm text-emerald-700">
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{progressMessage}</span>
          <span className="text-emerald-400 text-xs ml-auto">
            {progressStep === 'understand' ? '步骤 1/2' : '步骤 2/2'}
          </span>
        </div>
      )}

      {/* Split panels */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 border-r border-border overflow-hidden">
          <CodePanel code={codeContent} isStreaming={isStreaming} />
        </div>
        <div className="flex-1 overflow-hidden">
          <PreviewPanel htmlContent={codeContent} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  )
}
