import { Eye, Loader2 } from 'lucide-react'

interface Props {
  htmlContent: string
  isStreaming: boolean
}

export default function PreviewPanel({ htmlContent, isStreaming }: Props) {
  return (
    <div className="h-full w-full relative bg-white">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 py-2 bg-card border-b border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-mono">
          <Eye className="size-3.5" />
          预览
        </span>
      </div>

      {isStreaming ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground" style={{ paddingTop: 32 }}>
          <Loader2 className="size-8 text-primary animate-spin" />
          <span className="text-sm">生成中，完成后自动预览...</span>
        </div>
      ) : htmlContent ? (
        <iframe
          key={`preview-${htmlContent.length}`}
          srcDoc={htmlContent}
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
