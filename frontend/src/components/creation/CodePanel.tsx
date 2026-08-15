import { useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { Position, editor } from 'monaco-editor'
import { Code2, Loader2 } from 'lucide-react'

interface Props {
  code: string
  isStreaming: boolean
  /** 用户编辑编辑器内容（生成中只读，不触发） */
  onChange?: (value: string) => void
}

// `!` → HTML5 骨架（Emmet 缩写；`${1:xxx}` 为 Monaco snippet 制表位）
const HTML_SKELETON =
  '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:页面标题}</title>\n</head>\n<body>\n  ${2}\n</body>\n</html>'

let skeletonProviderRegistered = false

export default function CodePanel({ code, isStreaming, onChange }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    // `!` → HTML5 骨架：Monaco 自带 Emmet 对单个 `!` 缩写触发不稳，手动补 provider 保证 VSCode 行为。
    // 注册在 monaco 实例上（全局、按页一次），用模块级标志防 StrictMode 双挂载重复注册。
    if (!skeletonProviderRegistered) {
      skeletonProviderRegistered = true
      monaco.languages.registerCompletionItemProvider('html', {
        triggerCharacters: ['!'],
        provideCompletionItems: (model: editor.ITextModel, position: Position) => {
          const line = model.getLineContent(position.lineNumber)
          const before = line.slice(0, position.column - 1)
          if (!before.endsWith('!')) return { suggestions: [] }
          return {
            suggestions: [
              {
                label: '! HTML5 骨架',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                insertText: HTML_SKELETON,
                range: new monaco.Range(
                  position.lineNumber,
                  position.column - 1,
                  position.lineNumber,
                  position.column
                ),
                documentation: { value: '插入 HTML5 文档骨架' },
              },
            ],
          }
        },
      })
    }
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
        onChange={(value) => onChange?.(value ?? '')}
        options={{
          readOnly: isStreaming,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: true,
          automaticLayout: true,
          padding: { top: 36 },
          // 输入提示（VSCode-like IntelliSense；CDN 全量构建自带 HTML/CSS/JS 语言服务 + Emmet）
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          tabCompletion: 'on',
          snippetSuggestions: 'top',
          wordBasedSuggestions: 'currentDocument',
          parameterHints: { enabled: true },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          // emmet 运行时支持但缺类型声明，断言补充（! → HTML5 骨架：内联预览 + 补全列表均可见）
          ...({
            emmet: { showExpandedAbbreviation: 'always', showAbbreviationSuggestions: true },
          } as Partial<editor.IStandaloneEditorConstructionOptions>),
        }}
        loading={<div className="flex items-center justify-center h-full text-gray-400">加载编辑器...</div>}
      />
    </div>
  )
}
