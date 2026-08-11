import { useEffect, useRef, useState } from 'react'

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
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-500">
        📱 预览
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
        <div className="flex items-center justify-center h-full text-gray-400 text-sm" style={{ paddingTop: 32 }}>
          输入描述并点击生成，预览将在此显示
        </div>
      )}
    </div>
  )
}
