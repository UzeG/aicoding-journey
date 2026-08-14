import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import DataTable from '../../components/admin/DataTable'
import Pagination from '../../components/admin/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { listAdminTraces } from '../../api/admin'
import type { AdminTraceListItem } from '../../types/admin'
import { formatDateTime } from '../../lib/utils'

const PAGE_SIZE = 20

function SourceBadge({ source }: { source: string }) {
  return source === 'test' ? <Badge variant="secondary">测试</Badge> : <Badge>生成</Badge>
}

function StrategyBadge({ strategy }: { strategy: string }) {
  return strategy === 'single_step' ? <Badge variant="secondary">单步</Badge> : <Badge>两步</Badge>
}

function StatusBadge({ status }: { status: string }) {
  return status === 'success' ? <Badge variant="success">成功</Badge> : <Badge variant="destructive">失败</Badge>
}

export default function AdminTracesView() {
  const [items, setItems] = useState<AdminTraceListItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('') // input-bound value
  const [query, setQuery] = useState({ page: 1, search: '', source: '', status: '' }) // committed query
  const [loading, setLoading] = useState(true)

  const load = useCallback((p: number, s: string, src: string, st: string) => {
    setLoading(true)
    listAdminTraces({
      search: s || undefined,
      source: src || undefined,
      status: st || undefined,
      page: p,
      page_size: PAGE_SIZE,
    })
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
    const t = setTimeout(() => setQuery((q) => ({ ...q, page: 1, search })), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    load(query.page, query.search, query.source, query.status)
  }, [query, load])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">生成轨迹</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索原始 prompt"
            className="pl-8"
          />
        </div>
        <Select
          value={query.source}
          onValueChange={(v) => setQuery((q) => ({ ...q, source: v, page: 1 }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="来源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部来源</SelectItem>
            <SelectItem value="generation">生成</SelectItem>
            <SelectItem value="test">测试</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={query.status}
          onValueChange={(v) => setQuery((q) => ({ ...q, status: v, page: 1 }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="error">失败</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable<AdminTraceListItem>
            rows={items}
            keyFn={(t) => t.id}
            emptyText="没有匹配的轨迹"
            columns={[
              {
                key: 'created',
                header: '时间',
                render: (t) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(t.created_at)}</span>,
              },
              { key: 'source', header: '来源', render: (t) => <SourceBadge source={t.source} /> },
              { key: 'strategy', header: '策略', render: (t) => <StrategyBadge strategy={t.strategy} /> },
              { key: 'status', header: '状态', render: (t) => <StatusBadge status={t.status} /> },
              {
                key: 'prompt',
                header: 'Prompt',
                render: (t) => <span className="text-xs text-foreground max-w-[24rem] block truncate">{t.prompt || '-'}</span>,
              },
              { key: 'model', header: '模型', render: (t) => <span className="text-xs font-mono">{t.model || '-'}</span> },
              {
                key: 'tokens',
                header: 'Token',
                render: (t) => <span className="text-xs">{t.tokens_used ?? '-'}</span>,
              },
              {
                key: 'duration',
                header: '耗时',
                render: (t) => <span className="text-xs">{t.duration_ms != null ? `${t.duration_ms}ms` : '-'}</span>,
              },
              {
                key: 'actions',
                header: '',
                render: (t) => (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/admin/traces/${t.id}`}>详情</Link>
                  </Button>
                ),
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
