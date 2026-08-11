import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="size-8 text-primary animate-spin mb-3" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
