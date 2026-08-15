import { useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Code2, Loader2 } from 'lucide-react'

interface Props {
  code: string
  isStreaming: boolean
}

export default function CodePanel({ code, isStreaming }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  // 流式追加时自动滚动：最后一行停在距视口底部 1/3 处
  useEffect(() => {
    if (!isStreaming || !editorRef.current) return
    const ed = editorRef.current
    const model = ed.getModel()
    if (!model) return
    const lastLine = model.getLineCount()
    const lastLineBottom = ed.getBottomForLineNumber(lastLine)  // 文档绝对坐标
    const viewportH = ed.getLayoutInfo().height
    // 让最后一行的底部位于视口 9/10 处 → 距底部 1/10
    const targetTop = lastLineBottom - Math.floor(viewportH * 9 / 10)
    ed.setScrollTop(Math.max(0, targetTop))
  }, [code, isStreaming])

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-300 text-xs border-b border-gray-800">
        <span className="flex items-center gap-1.5 font-mono">
          <Code2 className="size-3.5" />
          源码
        </span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-live">
            <Loader2 className="size-3 animate-spin" />
            生成中...
          </span>
        )}
      </div>
      <Editor
        height="100%"
        defaultLanguage="html"
        value={code}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: true,
          automaticLayout: true,
          padding: { top: 36 },
        }}
        loading={<div className="flex items-center justify-center h-full text-gray-400">加载编辑器...</div>}
      />
    </div>
  )
}
