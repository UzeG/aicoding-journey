import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, Lightbulb, CheckCircle2, CircleAlert, Palette, Check, Sun, Moon, Monitor } from 'lucide-react'
import { getLLMSettings, updateLLMSettings, updateProfile } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { cn } from '../lib/utils'
import { THEME_ACCENTS, DEFAULT_THEME, applyTheme, cacheTheme, applyAppearance, activeAppearance, type AppearanceMode } from '../lib/theme'
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

const APPEARANCE_OPTIONS: Array<{ key: AppearanceMode; label: string; icon: typeof Sun }> = [
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
  { key: 'system', label: '跟随设备', icon: Monitor },
]

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
  const { isAuthenticated, user } = useAuthStore()
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

  /** 切换主题色：乐观应用 → 持久化 → 失败回滚 */
  const handleThemeChange = async (hex: string) => {
    const current = useAuthStore.getState().user
    if (!current) return
    const prev = current.theme ?? DEFAULT_THEME.hex
    useAuthStore.setState({ user: { ...current, theme: hex } })
    applyTheme(hex)
    cacheTheme(hex)
    try {
      await updateProfile({ theme: hex })
    } catch {
      useAuthStore.setState({ user: { ...current, theme: prev } })
      applyTheme(prev)
      cacheTheme(prev)
    }
  }

  /** 切换外观模式：乐观应用 → 持久化 → 失败回滚 */
  const handleAppearanceChange = async (mode: AppearanceMode) => {
    const current = useAuthStore.getState().user
    if (!current) return
    const prev: AppearanceMode = activeAppearance(current.appearance)
    useAuthStore.setState({ user: { ...current, appearance: mode } })
    applyAppearance(mode, current.theme)
    try {
      await updateProfile({ appearance: mode })
    } catch {
      useAuthStore.setState({ user: { ...current, appearance: prev } })
      applyAppearance(prev, current.theme)
    }
  }

  const currentTheme = user?.theme ?? DEFAULT_THEME.hex
  const currentAppearance = activeAppearance(user?.appearance)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">设置</h1>
      </div>

      {/* 外观与主题：深浅色 × 主题色 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            外观与主题
          </CardTitle>
          <CardDescription>
            选择深浅色外观，再选一个主题色——深浅色下都有全部主题色可选。浏览他人主页时仍使用你自己的主题。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 外观：浅色 / 深色 / 跟随设备 */}
          <div className="flex rounded-lg bg-muted p-0.5 mb-6" role="tablist" aria-label="外观模式">
            {APPEARANCE_OPTIONS.map((o) => {
              const active = currentAppearance === o.key
              return (
                <button
                  key={o.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleAppearanceChange(o.key)}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <o.icon className="size-4" />
                  {o.label}
                </button>
              )
            })}
          </div>

          {/* 主题色：深浅色下都可用 */}
          <div className="flex flex-wrap gap-3">
            {THEME_ACCENTS.map((a) => {
              // 后端存小写，比较时忽略大小写
              const active = currentTheme.toLowerCase() === a.hex.toLowerCase()
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => handleThemeChange(a.hex)}
                  title={a.label}
                  aria-label={`主题色：${a.label}`}
                  aria-pressed={active}
                  className="relative size-10 rounded-full border-2 border-border shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ backgroundColor: a.hex }}
                >
                  {active && <Check className="absolute inset-0 m-auto size-5 text-white" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            深色模式下主色会自动使用亮色变体（跟随设备时按系统深浅自动切换）。
          </p>
        </CardContent>
      </Card>

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
                <span className="inline-flex items-center gap-0.5 text-success ml-2 text-xs font-normal">
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

          <div className="flex items-start gap-2 p-3 bg-live/10 rounded-lg text-xs text-live">
            <Lightbulb className="size-4 shrink-0 mt-0.5" />
            <span>
              提示：可在 <code className="bg-live/15 px-1 rounded">backend/.env</code> 中配置平台级默认值；此页面设的是你的个人配置，优先级更高。API Key 加密存储。
            </span>
          </div>

          {message && (
            <p className={`text-sm flex items-center gap-1.5 ${message.type === 'success' ? 'text-success' : 'text-destructive'}`}>
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
