import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CircleAlert, Loader2, Sparkles, Upload } from 'lucide-react'
import PromptInput from '../creation/PromptInput'
import { uploadHtml } from '../../api/endpoints'
import { useAuthStore } from '../../stores/auth'
import { cn } from '../../lib/utils'

export type HeroMode = 'upload' | 'generate'

interface Props {
  mode: HeroMode
  onModeChange: (m: HeroMode) => void
  onGenerate: (prompt: string) => void
  onPromptChange: (v: string) => void
  /** 上传成功回调（fileName），驱动右侧部署预览 */
  onUploaded: (fileName: string) => void
}

/** Hero 输入区：上传 / 生成 两条平等路径，都通向「部署」 */
export default function HeroInput({ mode, onModeChange, onGenerate, onPromptChange, onUploaded }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setError(null)
    setUploading(true)
    try {
      await uploadHtml(file)
      setDone(file.name)
      onUploaded(file.name)
    } catch (err: any) {
      setError(err.response?.data?.detail || '上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (f) void handleFile(f)
  }

  const tabCls = (active: boolean) =>
    cn(
      'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-3">
      {/* 分段切换：上传 / 生成 */}
      <div className="flex rounded-lg bg-muted p-0.5 mb-3" role="tablist" aria-label="HTML 来源">
        <button
          role="tab"
          aria-selected={mode === 'upload'}
          onClick={() => onModeChange('upload')}
          className={tabCls(mode === 'upload')}
        >
          <Upload className="size-4" />
          上传 HTML
        </button>
        <button
          role="tab"
          aria-selected={mode === 'generate'}
          onClick={() => onModeChange('generate')}
          className={tabCls(mode === 'generate')}
        >
          <Sparkles className="size-4" />
          AI 生成
        </button>
      </div>

      {mode === 'generate' ? (
        <PromptInput
          onGenerate={onGenerate}
          disabled={false}
          textareaClassName="bg-transparent"
          onChange={onPromptChange}
        />
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".html,.htm"
            hidden
            onChange={onInputChange}
          />
          {done ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 px-3 py-3">
              <span className="flex items-center gap-2 text-sm text-foreground min-w-0">
                <CheckCircle2 className="size-4 text-success shrink-0" />
                <span className="truncate">{done}</span>
                <span className="text-muted-foreground">已存为草稿</span>
              </span>
              <button
                onClick={() => navigate(`/${user?.user_id}?tab=projects`)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
              >
                去部署
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) void handleFile(f)
              }}
              disabled={uploading}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 transition-colors text-center',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
                'disabled:opacity-60'
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-6 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">上传中...</span>
                </>
              ) : (
                <>
                  <Upload className="size-6 text-primary" />
                  <span className="text-sm font-medium text-foreground">拖拽 .html 文件到这里，或点击选择</span>
                  <span className="text-xs text-muted-foreground">支持单个 html/htm 文件 · 上传即可上线</span>
                </>
              )}
            </button>
          )}
          {error && (
            <p className="mt-2 text-xs text-destructive flex items-center gap-1">
              <CircleAlert className="size-3 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
