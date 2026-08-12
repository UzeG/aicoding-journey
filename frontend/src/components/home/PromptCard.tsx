import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '../ui/card'

interface Props {
  prompt: string
  onClick: (prompt: string) => void
}

export default function PromptCard({ prompt, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="group text-left rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="p-5 flex items-start gap-3">
          <p className="text-sm text-foreground leading-relaxed flex-1 line-clamp-3">{prompt}</p>
          <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
        </CardContent>
      </Card>
    </button>
  )
}
