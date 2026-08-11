import { useEffect, useState } from 'react'
import { getLLMSettings, updateLLMSettings } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import type { LLMSettings } from '../types'

const MODEL_OPTIONS = [
  { value: 'deepseek-chat', label: 'DeepSeek V3' },
  { value: 'deepseek-reasoner', label: 'DeepSeek R1' },
  { value: 'qwen-plus', label: '通义千问 Plus' },
  { value: 'qwen-max', label: '通义千问 Max' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: '', label: '自定义...' },
]

const BASE_URL_OPTIONS = [
  { value: 'https://api.deepseek.com', label: 'DeepSeek' },
  { value: 'https://dashscope.aliyuncs.com/compatible-mode/v1', label: '阿里云百炼 (Qwen)' },
  { value: 'https://api.openai.com/v1', label: 'OpenAI' },
  { value: 'https://api.siliconflow.cn/v1', label: 'SiliconFlow' },
  { value: '', label: '自定义...' },
]

export default function SettingsView() {
  const { isAuthenticated } = useAuthStore()
  const [settings, setSettings] = useState<LLMSettings | null>(null)
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      getLLMSettings().then((res) => {
        setSettings(res.data)
        setModel(res.data.model || '')
        setBaseUrl(res.data.base_url || '')
      }).catch(() => {})
    }
  }, [isAuthenticated])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const payload: any = {}
      if (model) payload.model = model
      if (baseUrl) payload.base_url = baseUrl
      if (apiKey) payload.api_key = apiKey
      await updateLLMSettings(payload)
      setApiKey('')
      setMessage('✅ 设置已保存')
      setSettings((s) => s ? { ...s, model, base_url: baseUrl, has_api_key: !!(apiKey || s?.has_api_key) } : s)
    } catch {
      setMessage('❌ 保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">⚙️ LLM 配置</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">模型</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {model === '' && (
            <input
              type="text"
              placeholder="输入模型名称，如 deepseek-chat"
              className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => setModel(e.target.value)}
            />
          )}
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
            {settings?.has_api_key && <span className="text-emerald-600 ml-2 text-xs">(已设置)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settings?.has_api_key ? '留空则不修改已保存的 Key' : '填写你的 LLM API Key'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API 地址</label>
          <select
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {BASE_URL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {baseUrl === '' && (
            <input
              type="text"
              placeholder="输入 API Base URL"
              className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          )}
        </div>

        <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
          💡 提示：可在 <code className="bg-amber-100 px-1 rounded">backend/.env</code> 中配置平台级默认值；此页面设的是你的个人配置，优先级更高。API Key 加密存储。
        </div>

        {message && <p className="text-sm">{message}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium
                     hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
        >
          {saving ? '保存中...' : '💾 保存配置'}
        </button>
      </div>
    </div>
  )
}
