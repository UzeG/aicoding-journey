import { useRef, useState } from 'react'
import { CircleAlert, Loader2, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { uploadHtml } from '../../api/endpoints'

interface Props {
  /** Called after a successful upload (e.g. refresh the page list). */
  onUploaded: () => void
  /** Override alignment — default right-aligns (`items-end`) for the filter row. */
  className?: string
}

export default function UploadHtmlButton({ onUploaded, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // allow re-selecting the same file
    setError(null)
    setUploading(true)
    try {
      await uploadHtml(file)
      onUploaded()
    } catch (err: any) {
      setError(err.response?.data?.detail || '上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('inline-flex flex-col gap-1 items-end', className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm"
        hidden
        onChange={handleSelect}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? '上传中...' : '上传 HTML'}
      </Button>
      <p className="text-xs text-muted-foreground">仅支持单个 html/htm 文件</p>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <CircleAlert className="size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
