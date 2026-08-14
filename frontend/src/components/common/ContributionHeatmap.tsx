import { useMemo, useRef, useState } from 'react'
import type { ActivityResponse } from '../../types'

// Level 0 = no activity; 1-4 scale relative to the busiest day（与主色标签红同族）
const COLORS = ['bg-muted', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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

function levelOf(count: number, max: number): number {
  if (count === 0) return 0
  return Math.min(4, 1 + Math.floor((count / max) * 3.999))
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

function tooltipText(cell: Cell): string {
  const d = parseDate(cell.date)
  const noun = cell.count === 1 ? 'contribution' : 'contributions'
  return `${cell.count} ${noun} on ${MONTHS_FULL[d.getMonth()]} ${ordinal(d.getDate())}`
}

interface Props {
  data: ActivityResponse
  onYearChange: (year: number) => void
}

export default function ContributionHeatmap({ data, onYearChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ left: number; top: number; text: string } | null>(null)

  const { weeks, total } = useMemo(() => {
    const days = data.days
    const max = Math.max(1, ...days.map((d) => d.count))
    const cells: Cell[] = days.map((d) => ({
      date: d.date,
      count: d.count,
      level: levelOf(d.count, max),
    }))
    const total = days.reduce((s, d) => s + d.count, 0)

    // 前导列对齐到周一（与 GitHub 一致）
    const firstDow = days.length ? (parseDate(days[0].date).getDay() + 6) % 7 : 0
    const padded: (Cell | null)[] = [...Array<Cell | null>(firstDow).fill(null), ...cells]
    const weeks: Week[] = []
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7)
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }
    return { weeks, total }
  }, [data])

  const currentYear = new Date().getFullYear()
  const isCurrent = data.year === currentYear

  const showTooltip = (e: React.MouseEvent<HTMLDivElement>, cell: Cell) => {
    const cellRect = e.currentTarget.getBoundingClientRect()
    const wrapRect = wrapRef.current?.getBoundingClientRect()
    if (!wrapRect) return
    // 相对 wrap 的坐标 → absolute 定位，滚动时 tooltip 跟随块
    setTooltip({
      left: cellRect.left - wrapRect.left + cellRect.width / 2,
      top: cellRect.top - wrapRect.top,
      text: tooltipText(cell),
    })
  }

  const monthLabel = (week: Week, index: number): string => {
    const cell = week.find((c): c is Cell => c !== null)
    if (!cell) return ''
    const m = parseDate(cell.date).getMonth()
    const prev = index > 0 ? weeks[index - 1].find((c): c is Cell => c !== null) : undefined
    return m !== (prev ? parseDate(prev.date).getMonth() : -1) ? MONTHS_SHORT[m] : ''
  }

  const yearSelect = (className: string) => (
    <select
      className={className}
      value={data.year}
      onChange={(e) => onYearChange(Number(e.target.value))}
    >
      {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  )

  return (
    <div>
      {/* 标题 + PC 年份选择（右上） */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-foreground">
          {isCurrent ? `今年创建 ${total} 个页面` : `${data.year} 年创建 ${total} 个页面`}
        </p>
        {yearSelect('hidden sm:block h-7 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none')}
      </div>

      <div ref={wrapRef} className="relative">
        {/* 月份标签行（与热力图同宽对齐） */}
        <div className="flex gap-[3px] mb-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex-1 text-[10px] text-muted-foreground leading-none truncate">
              {monthLabel(week, wi)}
            </div>
          ))}
        </div>

        {/* 热力图 —— flex-1 铺满容器宽度，图例/月份与右缘对齐 */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex-1 flex flex-col gap-[3px]">
              {week.map((cell, di) =>
                cell ? (
                  <div
                    key={di}
                    className={`w-full aspect-square rounded-[2px] cursor-pointer ${COLORS[cell.level]}`}
                    onMouseEnter={(e) => showTooltip(e, cell)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ) : (
                  <div key={di} className="w-full aspect-square rounded-[2px]" />
                )
              )}
            </div>
          ))}
        </div>

        {/* 自定义 tooltip（GitHub 风格：块上方深色气泡） */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg"
            style={{ left: tooltip.left, top: tooltip.top, transform: 'translate(-50%, calc(-100% - 8px))' }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* 图例（右对齐到热力图右缘） */}
      <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
        少
        {COLORS.map((c) => <span key={c} className={`size-[10px] rounded-[2px] ${c}`} />)}
        多
      </div>

      {/* 手机端年份选择（热力图下方下拉框） */}
      <div className="sm:hidden mt-2">
        {yearSelect('w-full h-7 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none')}
      </div>
    </div>
  )
}
