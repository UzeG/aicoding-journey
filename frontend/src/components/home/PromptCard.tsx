import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '../ui/card'

interface Props {
  prompt: string
  onClick: (prompt: string) => void
  icon: LucideIcon
  accentClass: string // 完整字面量类名，来自 lib/promptMeta.ts
  label: string
}

export default function PromptCard({ prompt, onClick, icon: Icon, accentClass, label }: Props) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="group text-left rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${accentClass}`}
            >
              <Icon className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${accentClass} mb-1.5`}
              >
                {label}
              </span>
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">{prompt}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
