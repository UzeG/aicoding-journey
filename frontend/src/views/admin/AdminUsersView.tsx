import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import DataTable from '../../components/admin/DataTable'
import Pagination from '../../components/admin/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { listAdminUsers } from '../../api/admin'
import type { AdminUserListItem } from '../../types/admin'
import { formatDateTime } from '../../lib/utils'

const PAGE_SIZE = 20

export default function AdminUsersView() {
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('') // input-bound value
  const [query, setQuery] = useState({ page: 1, search: '' }) // committed query
  const [loading, setLoading] = useState(true)

  const load = useCallback((p: number, s: string) => {
    setLoading(true)
    listAdminUsers({ search: s || undefined, page: p, page_size: PAGE_SIZE })
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
        <h1 className="text-2xl font-bold text-foreground">用户</h1>
        <div className="relative w-64">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索手机号 / user_id / 昵称"
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable<AdminUserListItem>
            rows={items}
            keyFn={(u) => u.id}
            emptyText="没有匹配的用户"
            columns={[
              {
                key: 'user',
                header: '用户',
                render: (u) => (
                  <div>
                    <p className="font-medium text-foreground">
                      {u.nickname || '未命名'}
                      {u.is_admin && <Badge variant="secondary" className="ml-2">管理员</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">@{u.user_id || '-'}</p>
                  </div>
                ),
              },
              { key: 'phone', header: '手机号', render: (u) => <span className="font-mono text-xs">{u.phone}</span> },
              { key: 'pages', header: '页面', render: (u) => u.pages_count },
              {
                key: 'created',
                header: '注册时间',
                render: (u) => <span className="text-xs text-muted-foreground">{formatDateTime(u.created_at)}</span>,
              },
              {
                key: 'actions',
                header: '',
                render: (u) => (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/admin/users/${u.id}`}>详情</Link>
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
