import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface Props {
  onGenerate: (prompt: string) => void
  disabled: boolean
  initialValue?: string
  /** 透传给 textarea 的类名（首页卡片化输入框传 bg-transparent） */
  textareaClassName?: string
  /** 输入变化通知（首页用于驱动编译面板演示） */
  onChange?: (value: string) => void
}

export default function PromptInput({ onGenerate, disabled, initialValue = '', textareaClassName, onChange }: Props) {
  const [value, setValue] = useState(initialValue)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onGenerate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME 输入法选词的回车不触发生成（isComposing / keyCode 229 双保险）
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-3">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          onChange?.(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        placeholder="描述你想造的工具，例如：做一个话费计算器..."
        rows={2}
        disabled={disabled}
        className={cn('flex-1 resize-none bg-background', textareaClassName)}
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-6 h-auto whitespace-nowrap self-stretch"
      >
        {disabled ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {disabled ? '生成中...' : '生成'}
      </Button>
    </div>
  )
}
