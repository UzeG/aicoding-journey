import { useNavigate } from 'react-router-dom'
import { ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import DownloadButton from '../common/DownloadButton'
import { getPage } from '../../api/endpoints'
import { cn } from '../../lib/utils'
import type { PageItem } from '../../types'

interface Props {
  page: PageItem
  user_id: string
  isOwn: boolean
  onDelete: (page: PageItem) => void
}

export default function ProjectCard({ page, user_id, isOwn, onDelete }: Props) {
  const navigate = useNavigate()
  const url = page.is_published && page.page_id ? `/${user_id}/${page.page_id}` : undefined

  return (
    <Card className="hover:border-primary/40 transition-colors overflow-hidden">
      <div className="md:flex md:items-center">
        {/* 封面：移动端顶部全宽（点击跳发布页）；桌面左侧 44 */}
        <a
          href={url}
          className={cn(
            'block aspect-video w-full relative bg-muted md:w-44 md:shrink-0',
            !url && 'pointer-events-none'
          )}
          aria-label={page.title || '页面封面'}
        >
          {page.cover_url ? (
            <img
              src={page.cover_url}
              alt={page.title || '页面封面'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/40">
              <FileText className="size-8 opacity-40" />
            </div>
          )}
        </a>

        <CardContent className="p-4 md:flex-1 md:min-w-0">
          <div className="flex md:justify-between gap-3">
            {/* 左：标题 + 日期/链接 + tags */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{page.title || '未命名页面'}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="shrink-0">{new Date(page.created_at).toLocaleDateString('zh-CN')}</span>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5 truncate min-w-0 max-w-[40vw] md:max-w-full"
                  >
                    {url}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                )}
              </div>
              {page.tags && page.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {page.tags.map((t) => (
                    <Badge key={t} variant="muted" className="text-[11px] font-normal">{t}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 右：操作（移动端 icon-only，桌面带文字） */}
            {isOwn && (
              <div className="flex items-start md:items-center gap-1 md:gap-2 shrink-0">
                <DownloadButton
                  fileName={page.title || page.page_id}
                  getContent={() => getPage(page.id).then((res) => res.data.html_content)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 md:px-3"
                  onClick={() => navigate(`/creation?pageId=${page.id}`)}
                >
                  <Pencil className="size-4" />
                  <span className="hidden md:inline">编辑</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 md:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(page)}
                >
                  <Trash2 className="size-4" />
                  <span className="hidden md:inline">删除</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
