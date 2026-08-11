import { useEffect, useRef, useState } from 'react'
import { Eye } from 'lucide-react'

interface Props {
  htmlContent: string
  isStreaming: boolean
}

export default function PreviewPanel({ htmlContent, isStreaming }: Props) {
  const [debouncedHtml, setDebouncedHtml] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (isStreaming) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setDebouncedHtml(htmlContent), 500)
    } else {
      setDebouncedHtml(htmlContent)
    }
    return () => clearTimeout(timerRef.current)
  }, [htmlContent, isStreaming])

  return (
    <div className="h-full w-full relative bg-white">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 py-2 bg-white border-b border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Eye className="size-3.5" />
          预览
        </span>
      </div>
      {debouncedHtml ? (
        <iframe
          key={`preview-${debouncedHtml.length}`}
          srcDoc={debouncedHtml}
          sandbox="allow-scripts"
          allow="webgl"
          className="w-full h-full border-0"
          style={{ paddingTop: 32 }}
          title="页面预览"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm" style={{ paddingTop: 32 }}>
          输入描述并点击生成，预览将在此显示
        </div>
      )}
    </div>
  )
}
