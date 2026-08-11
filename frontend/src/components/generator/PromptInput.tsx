import { useState } from 'react'

interface Props {
  onGenerate: (prompt: string) => void
  disabled: boolean
  initialValue?: string
}

export default function PromptInput({ onGenerate, disabled, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onGenerate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="描述你想要生成的网页，例如：做一个南京天气预报页面..."
        rows={2}
        disabled={disabled}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium
                   hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors whitespace-nowrap"
      >
        {disabled ? '生成中...' : '🚀 生成'}
      </button>
    </div>
  )
}
