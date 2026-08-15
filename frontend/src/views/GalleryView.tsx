import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, FileText, Flame, Heart, LayoutGrid, Search, Star } from 'lucide-react'
import { getGallery } from '../api/endpoints'
import Avatar from '../components/common/Avatar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Pagination from '../components/admin/Pagination'
import { Input } from '../components/ui/input'
import { cn } from '../lib/utils'
import type { GalleryResponse } from '../types'

const PAGE_SIZE = 12
type SortKey = 'latest' | 'hot'

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Clock }[] = [
  { key: 'latest', label: '最新', icon: Clock },
  { key: 'hot', label: '最热', icon: Flame },
]

export default function GalleryView() {
  const [data, setData] = useState<GalleryResponse | null>(null)
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<SortKey>('latest')
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 搜索输入防抖
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQ(searchText.trim())
      setPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchText])

  useEffect(() => {
    setLoading(true)
    getGallery({ tag: tag || undefined, q: q || undefined, sort, page, page_size: PAGE_SIZE })
      .then((res) => { setData(res.data); setError(null) })
      .catch(() => setError('加载失败，请稍后重试'))
      .finally(() => setLoading(false))
  }, [tag, sort, q, page])

  const selectTag = (t: string) => { setTag(t === tag ? '' : t); setPage(1) }
  const selectSort = (s: SortKey) => { setSort(s); setPage(1) }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-[60vh]">
      {/* 标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">作品广场</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">浏览所有人发布的单页作品，支持标签检索</p>
      </div>

      {/* 控制区 */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索页面名称..."
              className="pl-8 h-9"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => selectSort(opt.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                  sort === opt.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <opt.icon className="size-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* tag 筛选 */}
        {data && data.tag_counts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => selectTag('')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs border transition-colors',
                !tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
              )}
            >
              全部
            </button>
            {data.tag_counts.map((t) => (
              <button
                key={t.tag}
                onClick={() => selectTag(t.tag)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs border transition-colors',
                  tag === t.tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                )}
              >
                {t.tag} · {t.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 内容区 */}
      {loading && !data ? (
        <LoadingSpinner text="加载作品中..." />
      ) : error ? (
        <p className="text-center text-sm text-destructive py-20">{error}</p>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">没有符合条件的作品</p>
          {(tag || q) && (
            <button onClick={() => { setTag(''); setSearchText(''); setQ('') }} className="mt-2 text-sm text-primary hover:underline">
              清除筛选
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {data.items.map((item) => (
              <div key={item.id} className="group">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video rounded-lg overflow-hidden border border-border bg-muted"
                >
                  {item.cover_url ? (
                    <img
                      src={item.cover_url}
                      alt={item.title || '作品封面'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <FileText className="size-8 opacity-40" />
                    </div>
                  )}
                </a>
                <div className="mt-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-medium text-sm text-foreground truncate hover:text-primary"
                  >
                    {item.title || '未命名页面'}
                  </a>
                  <div className="flex items-center justify-between mt-1.5">
                    <Link
                      to={`/${item.author.user_id}`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary min-w-0"
                    >
                      <Avatar
                        src={item.author.avatar_url}
                        name={item.author.nickname || item.author.user_id}
                        className="size-5 text-[10px]"
                      />
                      <span className="truncate">{item.author.nickname || item.author.user_id}</span>
                    </Link>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Heart className="size-3" />
                      {item.like_count}
                      <Star className="size-3 ml-1" />
                      {item.favorite_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.total > PAGE_SIZE && (
            <div className="mt-8">
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
