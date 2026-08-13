/** 推荐提示词加载骨架屏（animate-pulse） */
export default function PromptCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm animate-pulse">
          <div className="flex items-start gap-3">
            <span className="size-10 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <span className="block h-3 w-14 rounded-full bg-muted" />
              <span className="block h-3 rounded bg-muted" />
              <span className="block h-3 w-3/4 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
