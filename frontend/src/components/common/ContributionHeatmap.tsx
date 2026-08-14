import { useMemo } from 'react'
import type { ActivityDay } from '../../types'

// Level 0 = no activity; 1-4 scale relative to the busiest day.
const COLORS = ['bg-muted', 'bg-emerald-100', 'bg-emerald-300', 'bg-emerald-500', 'bg-emerald-700']

interface Cell {
  date: string
  count: number
  level: number
}
type Week = (Cell | null)[]

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d) // local time — avoids UTC date shift on getDay()
}

export default function ContributionHeatmap({ days }: { days: ActivityDay[] }) {
  const { weeks, total } = useMemo(() => {
    if (!days.length) return { weeks: [] as Week[], total: 0 }

    const max = Math.max(1, ...days.map((d) => d.count))
    const cells: Cell[] = days.map((d) => ({
      date: d.date,
      count: d.count,
      level: d.count === 0 ? 0 : Math.min(4, 1 + Math.floor((d.count / max) * 3.999)),
    }))
    const total = days.reduce((s, d) => s + d.count, 0)

    // Pad the leading partial column so week columns align (Monday-first).
    const firstDow = (parseDate(days[0].date).getDay() + 6) % 7
    const padded: (Cell | null)[] = [...Array<Cell | null>(firstDow).fill(null), ...cells]
    const weeks: Week[] = []
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7)
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }
    return { weeks, total }
  }, [days])

  if (!days.length) return null

  return (
    <div>
      <p className="text-sm text-foreground mb-3">过去一年创建 {total} 个页面</p>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) =>
                cell ? (
                  <div
                    key={di}
                    className={`size-[10px] rounded-[2px] ${COLORS[cell.level]}`}
                    title={`${cell.date}: 创建 ${cell.count} 个页面`}
                  />
                ) : (
                  <div key={di} className="size-[10px] rounded-[2px]" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
        少
        {COLORS.map((c) => <span key={c} className={`size-[10px] rounded-[2px] ${c}`} />)}
        多
      </div>
    </div>
  )
}
