import Editor from '@monaco-editor/react'
import { Code2, Loader2 } from 'lucide-react'

interface Props {
  code: string
  isStreaming: boolean
}

export default function CodePanel({ code, isStreaming }: Props) {
  return (
    <div className="h-full w-full relative">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-300 text-xs border-b border-gray-800">
        <span className="flex items-center gap-1.5">
          <Code2 className="size-3.5" />
          代码
        </span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-emerald-400">
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
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 36 },
        }}
        loading={<div className="flex items-center justify-center h-full text-gray-400">加载编辑器...</div>}
      />
    </div>
  )
}
