import { useEffect, useRef, useState } from 'react'
import { Eraser, Loader2, MessageSquare, Send, Square } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select'
import { chatSSE } from '../../api/admin'
import { cn } from '../../lib/utils'

// Radix Select disallows empty-string item values — use a sentinel.
const CUSTOM = '__custom__'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export default function AdminChatView() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [configMode, setConfigMode] = useState<string>('platform')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef('')
  const startAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, streamingText])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const stop = () => {
    abortRef.current?.abort()
    setRunning(false)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || running) return
    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    streamRef.current = ''
    setStreamingText('')
    setRunning(true)
    startAtRef.current = performance.now()
    setElapsed(0)
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.round(performance.now() - startAtRef.current))
    }, 100)

    const abortController = new AbortController()
    abortRef.current = abortController
    const config = configMode === CUSTOM
      ? { model: model || undefined, base_url: baseUrl || undefined, api_key: apiKey || undefined }
      : undefined

    try {
      const response = await chatSSE({ messages: [{ role: 'user', content: text }], config }, abortController.signal)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.detail || `请求失败（${response.status}）`)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: Record<string, unknown>
          try { event = JSON.parse(line.slice(6)) } catch { continue }
          if (event.type === 'token') {
            streamRef.current += String(event.content ?? '')
            setStreamingText(streamRef.current)
          } else if (event.type === 'done') {
            // no-op；finally 收尾
          } else if (event.type === 'error') {
            setError(String(event.message ?? '请求失败'))
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || '网络错误')
      }
    } finally {
      if (timerRef.current) window.clearInterval(timerRef.current)
      setElapsed(Math.round(performance.now() - startAtRef.current))
      if (streamRef.current) {
        setMessages((prev) => [...prev, { role: 'assistant', content: streamRef.current }])
      }
      setStreamingText('')
      setRunning(false)
    }
  }

  const clear = () => {
    stop()
    setMessages([])
    setStreamingText('')
    setError(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">LLM 聊天测试</h1>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">单轮 prompt → 流式回复（连通性 / 回复质量测试）</CardTitle>
          <Button variant="ghost" size="sm" onClick={clear} disabled={running && messages.length === 0}>
            <Eraser className="size-4" />
            清空
          </Button>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col">
          {/* 状态：耗时 */}
          <div className="text-xs text-muted-foreground mb-2 min-h-[1rem]">
            {running ? (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Loader2 className="size-3 animate-spin" />
                LLM 回复中… {elapsed}ms
              </span>
            ) : elapsed > 0 ? (
              <span>本次耗时 {elapsed}ms</span>
            ) : null}
          </div>

          {/* 消息列表 */}
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
            {messages.length === 0 && !streamingText && !running && (
              <p className="text-sm text-muted-foreground text-center py-12">
                输入一条 prompt，测试 LLM 是否连通、回复如何。
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {running && !streamingText && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-sm bg-muted text-foreground rounded-bl-sm inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin shrink-0" />
                  思考中…
                </div>
              </div>
            )}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words bg-muted text-foreground rounded-bl-sm">
                  <span className="inline-flex items-center gap-1.5">
                    {streamingText}
                    <Loader2 className="size-3.5 animate-spin shrink-0 text-muted-foreground" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-rose-50 rounded-md px-3 py-2 mb-2">{error}</p>
          )}

          {/* 配置选择 */}
          <div className="flex items-end gap-4 mb-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">LLM 配置</Label>
              <Select value={configMode} onValueChange={setConfigMode}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="选择配置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">平台默认</SelectItem>
                  <SelectItem value={CUSTOM}>自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {configMode === CUSTOM && (
              <div className="flex gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">模型</Label>
                  <Input className="h-8 w-44 text-sm" value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">API 地址</Label>
                  <Input className="h-8 w-56 text-sm" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">API Key（仅本次）</Label>
                  <Input className="h-8 w-56 text-sm" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="留空用平台默认" />
                </div>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="输入 prompt，Enter 发送，Shift+Enter 换行"
              rows={2}
              className="flex-1"
            />
            {running ? (
              <Button variant="outline" onClick={stop}>
                <Square className="size-4" />
                停止
              </Button>
            ) : (
              <Button onClick={send} disabled={!input.trim()}>
                <Send className="size-4" />
                发送
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
