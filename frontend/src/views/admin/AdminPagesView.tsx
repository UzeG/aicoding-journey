import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import DataTable from '../../components/admin/DataTable'
import Pagination from '../../components/admin/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { listAdminPages } from '../../api/admin'
import type { AdminPageListItem } from '../../types/admin'
import { formatDateTime, formatBytes } from '../../lib/utils'

const PAGE_SIZE = 20

function PageStatusBadge({ page }: { page: AdminPageListItem }) {
  if (page.status === 'deleted') return <Badge variant="destructive">已删除</Badge>
  if (page.is_published) return <Badge variant="success">已发布</Badge>
  if (page.is_saved) return <Badge variant="secondary">草稿</Badge>
  return <Badge variant="muted">未保存</Badge>
}

export default function AdminPagesView() {
  const [items, setItems] = useState<AdminPageListItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('') // input-bound value
  const [query, setQuery] = useState({ page: 1, search: '' }) // committed query
  const [loading, setLoading] = useState(true)

  const load = useCallback((p: number, s: string) => {
    setLoading(true)
    listAdminPages({ search: s || undefined, page: p, page_size: PAGE_SIZE })
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
        <h1 className="text-2xl font-bold text-foreground">页面</h1>
        <div className="relative w-72">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / page_id / prompt"
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable<AdminPageListItem>
            rows={items}
            keyFn={(p) => p.id}
            emptyText="没有匹配的页面"
            columns={[
              {
                key: 'title',
                header: '标题 / page_id',
                render: (p) => (
                  <div>
                    <p className="font-medium text-foreground">{p.title || '未命名'}</p>
                    <p className="text-xs font-mono text-muted-foreground">{p.page_id || '-'}</p>
                  </div>
                ),
              },
              {
                key: 'owner',
                header: '作者',
                render: (p) => (
                  <span className="text-xs text-muted-foreground">
                    {p.user_nickname || '?'}
                    <span className="block font-mono">{p.user_id.slice(0, 8)}</span>
                  </span>
                ),
              },
              { key: 'status', header: '状态', render: (p) => <PageStatusBadge page={p} /> },
              { key: 'size', header: '大小', render: (p) => <span className="text-xs">{formatBytes(p.file_size)}</span> },
              {
                key: 'updated',
                header: '更新时间',
                render: (p) => <span className="text-xs text-muted-foreground">{formatDateTime(p.updated_at)}</span>,
              },
              {
                key: 'actions',
                header: '',
                render: (p) => (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/admin/pages/${p.id}`}>详情</Link>
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
