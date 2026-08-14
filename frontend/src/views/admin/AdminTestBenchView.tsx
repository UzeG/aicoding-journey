import { useEffect, useRef, useState } from 'react'
import { Eraser, FlaskConical, Loader2, Play, Square, Timer } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { testGenerateSSE } from '../../api/admin'

// Radix Select disallows empty-string item values — use a sentinel.
const CUSTOM = '__custom__'

interface Step1Result {
  refined_prompt: string
  libraries: string[]
}

export default function AdminTestBenchView() {
  const [prompt, setPrompt] = useState('')
  const [strategy, setStrategy] = useState<string>('two_step')
  const [configMode, setConfigMode] = useState<string>('platform')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [step1, setStep1] = useState<Step1Result | null>(null)
  const [raw, setRaw] = useState('')
  const [code, setCode] = useState('')
  const [finalHtml, setFinalHtml] = useState('')
  const [tokens, setTokens] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const rawRef = useRef<HTMLPreElement>(null)
  const startAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  // Auto-scroll the raw stream to the bottom while it grows.
  useEffect(() => {
    if (rawRef.current) rawRef.current.scrollTop = rawRef.current.scrollHeight
  }, [raw])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const reset = () => {
    setStep1(null)
    setRaw('')
    setCode('')
    setFinalHtml('')
    setTokens(null)
    setElapsed(0)
    setError(null)
    setProgress('')
  }

  const run = async () => {
    if (!prompt.trim() || running) return
    reset()
    setRunning(true)
    startAtRef.current = performance.now()
    timerRef.current = window.setInterval(() => {
      setElapsed(performance.now() - startAtRef.current)
    }, 100)

    const abortController = new AbortController()
    abortRef.current = abortController

    const config = configMode === 'custom'
      ? { model: model || undefined, base_url: baseUrl || undefined, api_key: apiKey || undefined }
      : undefined

    try {
      const response = await testGenerateSSE({ prompt, strategy, config }, abortController.signal)
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
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          switch (event.type) {
            case 'progress':
              setProgress(String(event.message ?? ''))
              break
            case 'step1':
              setStep1({
                refined_prompt: String(event.refined_prompt ?? ''),
                libraries: Array.isArray(event.libraries) ? (event.libraries as string[]) : [],
              })
              break
            case 'token_raw':
              setRaw((r) => r + String(event.content ?? ''))
              break
            case 'token':
              setCode((c) => c + String(event.content ?? ''))
              break
            case 'final':
              setFinalHtml(String(event.content ?? ''))
              break
            case 'done':
              setTokens(event.tokens_used ? Number(event.tokens_used) : null)
              break
            case 'error':
              setError(String(event.message ?? '生成失败'))
              break
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || '网络错误')
      }
    } finally {
      setRunning(false)
      setProgress('')
      if (timerRef.current) window.clearInterval(timerRef.current)
      setElapsed(performance.now() - startAtRef.current)
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setRunning(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">测试台</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">运行一次生成，实时查看 Step 1 / Step 2 中间输出</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入 prompt，例如：做一个手机话费计算器，支持套餐对比"
              rows={3}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>配置</Label>
              <Select value={configMode} onValueChange={setConfigMode}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="选择配置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">平台默认</SelectItem>
                  <SelectItem value={CUSTOM}>自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>生成策略</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="选择策略" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="two_step">两步（Step1 选库 + Step2 生成）</SelectItem>
                  <SelectItem value="single_step">单步（LLM 直出完整 HTML）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {configMode === CUSTOM && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label>模型</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
              </div>
              <div className="space-y-2">
                <Label>API 地址</Label>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
              </div>
              <div className="space-y-2">
                <Label>API Key（仅本次请求）</Label>
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="留空则用平台默认" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={run} disabled={running || !prompt.trim()}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? '生成中...' : '运行'}
            </Button>
            {running && (
              <Button variant="outline" onClick={stop}>
                <Square className="size-4" />
                停止
              </Button>
            )}
            <Button variant="ghost" onClick={reset} disabled={running}>
              <Eraser className="size-4" />
              清空
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-rose-50 rounded-md px-3 py-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {progress && <span className="text-foreground">{progress}...</span>}
        {tokens !== null && <span>Token：<span className="font-mono text-foreground">{tokens}</span></span>}
        {elapsed > 0 && (
          <span className="flex items-center gap-1">
            <Timer className="size-3.5" />
            耗时：<span className="font-mono text-foreground">{Math.round(elapsed)}ms</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Step 1 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step 1 输出</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {step1 ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">refined_prompt</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted/40 rounded-md p-3 max-h-40 overflow-auto">
                    {step1.refined_prompt}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">选中的 CDN 库</p>
                  <div className="flex flex-wrap gap-2">
                    {step1.libraries.length ? (
                      step1.libraries.map((l) => <Badge key={l}>{l}</Badge>)
                    ) : (
                      <span className="text-xs text-muted-foreground">（未选择）</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{running ? '等待 Step 1 输出...' : '运行后展示'}</p>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">预览</CardTitle>
          </CardHeader>
          <CardContent>
            {finalHtml ? (
              <iframe
                key={`final-${finalHtml.length}`}
                srcDoc={finalHtml}
                sandbox="allow-scripts"
                allow="webgl"
                className="w-full h-64 rounded-md border border-border"
                title="测试台预览"
              />
            ) : (
              <div className="flex items-center justify-center h-64 rounded-md border border-dashed border-border text-sm text-muted-foreground">
                完成后自动预览
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 2 raw stream */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Step 2 原始流（HTML 过滤前）
            <span className="text-xs text-muted-foreground font-normal">{raw.length.toLocaleString()} 字符</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            ref={rawRef}
            className="h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground whitespace-pre-wrap break-words"
          >
            {raw || (running ? '等待 Step 2 输出...' : '运行后展示')}
            {running && <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle" />}
          </pre>
        </CardContent>
      </Card>

      {/* Filtered code */}
      {code && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">过滤后代码（前端展示用）</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground whitespace-pre-wrap break-words">
              {code}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
