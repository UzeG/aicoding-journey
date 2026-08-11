import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, Lightbulb, CheckCircle2, CircleAlert } from 'lucide-react'
import { getLLMSettings, updateLLMSettings } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import type { LLMSettings } from '../types'

// 用哨兵值代替空字符串，radix Select 不允许空字符串 item value
const CUSTOM = '__custom__'

const MODEL_OPTIONS = [
  { value: 'deepseek-chat', label: 'DeepSeek V3' },
  { value: 'deepseek-reasoner', label: 'DeepSeek R1' },
  { value: 'qwen-plus', label: '通义千问 Plus' },
  { value: 'qwen-max', label: '通义千问 Max' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: CUSTOM, label: '自定义...' },
]

const BASE_URL_OPTIONS = [
  { value: 'https://api.deepseek.com', label: 'DeepSeek' },
  { value: 'https://dashscope.aliyuncs.com/compatible-mode/v1', label: '阿里云百炼 (Qwen)' },
  { value: 'https://api.openai.com/v1', label: 'OpenAI' },
  { value: 'https://api.siliconflow.cn/v1', label: 'SiliconFlow' },
  { value: CUSTOM, label: '自定义...' },
]

export default function SettingsView() {
  const { isAuthenticated } = useAuthStore()
  const [settings, setSettings] = useState<LLMSettings | null>(null)
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      getLLMSettings().then((res) => {
        setSettings(res.data)
        setModel(res.data.model || '')
        setBaseUrl(res.data.base_url || '')
      }).catch(() => {})
    }
  }, [isAuthenticated])

  const isCustomModel = !MODEL_OPTIONS.some((o) => o.value === model)
  const isCustomBaseUrl = !BASE_URL_OPTIONS.some((o) => o.value === baseUrl)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const payload: any = {}
      if (model) payload.model = model
      if (baseUrl) payload.base_url = baseUrl
      if (apiKey) payload.api_key = apiKey
      await updateLLMSettings(payload)
      setApiKey('')
      setMessage({ type: 'success', text: '设置已保存' })
      setSettings((s) => s ? { ...s, model, base_url: baseUrl, has_api_key: !!(apiKey || s?.has_api_key) } : s)
    } catch {
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">LLM 配置</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">模型参数</CardTitle>
          <CardDescription>配置用于生成页面的 LLM，优先级高于平台默认值</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Model */}
          <div className="space-y-2">
            <Label>模型</Label>
            <Select
              value={isCustomModel ? CUSTOM : model}
              onValueChange={(v) => setModel(v === CUSTOM ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCustomModel && (
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="输入模型名称，如 deepseek-chat"
                className="mt-2"
              />
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>
              API Key
              {settings?.has_api_key && (
                <span className="inline-flex items-center gap-0.5 text-emerald-600 ml-2 text-xs font-normal">
                  <CheckCircle2 className="size-3" />
                  已设置
                </span>
              )}
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.has_api_key ? '留空则不修改已保存的 Key' : '填写你的 LLM API Key'}
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label>API 地址</Label>
            <Select
              value={isCustomBaseUrl ? CUSTOM : baseUrl}
              onValueChange={(v) => setBaseUrl(v === CUSTOM ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择 API 地址" />
              </SelectTrigger>
              <SelectContent>
                {BASE_URL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCustomBaseUrl && (
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="输入 API Base URL"
                className="mt-2"
              />
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
            <Lightbulb className="size-4 shrink-0 mt-0.5" />
            <span>
              提示：可在 <code className="bg-amber-100 px-1 rounded">backend/.env</code> 中配置平台级默认值；此页面设的是你的个人配置，优先级更高。API Key 加密存储。
            </span>
          </div>

          {message && (
            <p className={`text-sm flex items-center gap-1.5 ${message.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
              {message.type === 'success' ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}
              {message.text}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
