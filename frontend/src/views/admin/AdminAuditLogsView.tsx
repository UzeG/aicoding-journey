import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import DataTable from '../../components/admin/DataTable'
import Pagination from '../../components/admin/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { listAdminAuditLogs } from '../../api/admin'
import type { AdminAuditLogItem } from '../../types/admin'
import { formatDateTime } from '../../lib/utils'

const PAGE_SIZE = 20

function ResultBadge({ result }: { result: string | null }) {
  if (result === 'passed' || result === 'ok') return <Badge variant="success">通过</Badge>
  if (result === 'blocked' || result === 'failed') return <Badge variant="destructive">{result}</Badge>
  return <Badge variant="muted">{result || '-'}</Badge>
}

export default function AdminAuditLogsView() {
  const [items, setItems] = useState<AdminAuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('') // input-bound value
  const [query, setQuery] = useState({ page: 1, search: '' }) // committed query
  const [loading, setLoading] = useState(true)

  const load = useCallback((p: number, s: string) => {
    setLoading(true)
    listAdminAuditLogs({ search: s || undefined, page: p, page_size: PAGE_SIZE })
      .then((res) => {
        setItems(res.data.items)
        setTotal(res.data.total)
      })
      .finally(() => setLoading(false))
  }, [])

  // Debounced search → reset to page 1
  const prevSearch = useRef(search)
  useEffect(() => {
    if (prevSearch.current === search) return
    prevSearch.current = search
    const t = setTimeout(() => setQuery({ page: 1, search }), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    load(query.page, query.search)
  }, [query, load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">审计日志</h1>
        <div className="relative w-64">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 action / 内容"
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable<AdminAuditLogItem>
            rows={items}
            keyFn={(a) => a.id}
            emptyText="没有审计日志"
            columns={[
              {
                key: 'created',
                header: '时间',
                render: (a) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.created_at)}</span>,
              },
              { key: 'action', header: '动作', render: (a) => <Badge variant="outline">{a.action}</Badge> },
              { key: 'result', header: '结果', render: (a) => <ResultBadge result={a.result} /> },
              {
                key: 'user',
                header: '用户',
                render: (a) => <span className="font-mono text-xs">{a.user_id ? a.user_id.slice(0, 8) : '-'}</span>,
              },
              {
                key: 'content',
                header: '内容',
                render: (a) => <span className="text-xs text-foreground max-w-[30rem] block truncate">{a.content || '-'}</span>,
              },
              {
                key: 'ip',
                header: 'IP',
                render: (a) => <span className="font-mono text-xs">{a.client_ip || '-'}</span>,
              },
            ]}
          />
          <Pagination
            page={query.page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(p) => setQuery((q) => ({ ...q, page: p }))}
          />
        </>
      )}
    </div>
  )
}
