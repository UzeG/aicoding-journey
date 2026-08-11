import { Smartphone, Calculator, Gift, Dices, ChartColumn, FileText, type LucideIcon } from 'lucide-react'
import type { Template } from '../../types'
import { Card, CardContent } from '../ui/card'

const iconMap: Record<string, LucideIcon> = {
  '📱': Smartphone,
  '💰': Calculator,
  '🎂': Gift,
  '🎮': Dices,
  '📊': ChartColumn,
}

// 剥离模板名中残留的 emoji 前缀，如 "📱 套餐对比表" → "套餐对比表"
function stripEmoji(name: string): string {
  return name.replace(/^[\p{Extended_Pictographic}️]+\s*/u, '')
}

interface Props {
  template: Template
  onClick: (template: Template) => void
}

export default function TemplateCard({ template, onClick }: Props) {
  const Icon = (template.icon && iconMap[template.icon]) || FileText

  return (
    <button
      onClick={() => onClick(template)}
      className="group text-left rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-center size-12 rounded-lg bg-emerald-50 text-primary mb-4 transition-transform duration-200 group-hover:scale-110">
            <Icon className="size-6" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">{stripEmoji(template.name)}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
        </CardContent>
      </Card>
    </button>
  )
}
