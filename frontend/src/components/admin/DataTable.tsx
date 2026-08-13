import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  keyFn: (row: T) => string
  emptyText?: string
}

export default function DataTable<T>({ columns, rows, keyFn, emptyText = '暂无数据' }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 font-medium whitespace-nowrap ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFn(row)} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-2.5 align-middle ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
