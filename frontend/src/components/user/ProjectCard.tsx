import { useNavigate } from 'react-router-dom'
import { CheckCircle2, CircleDashed, ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import DownloadButton from '../common/DownloadButton'
import { getPage } from '../../api/endpoints'
import type { PageItem } from '../../types'

const BACKEND_URL = import.meta.env.VITE_PUBLIC_BASE_URL || 'http://localhost:8000'

interface Props {
  page: PageItem
  user_id: string
  isOwn: boolean
  onDelete: (page: PageItem) => void
}

export default function ProjectCard({ page, user_id, isOwn, onDelete }: Props) {
  const navigate = useNavigate()

  return (
    <Card className="hover:border-primary/40 transition-colors overflow-hidden">
      <div className="flex items-center">
        {/* 左侧预览图（16:9） */}
        <div className="w-32 sm:w-44 shrink-0 aspect-video relative bg-muted">
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
          {page.is_published ? (
            <Badge variant="success" className="absolute top-2 left-2">
              <CheckCircle2 className="size-3" />
              已发布
            </Badge>
          ) : (
            <Badge variant="muted" className="absolute top-2 left-2">
              <CircleDashed className="size-3" />
              草稿
            </Badge>
          )}
        </div>
        <CardContent className="flex-1 min-w-0 p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{page.title || '未命名页面'}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{new Date(page.created_at).toLocaleDateString('zh-CN')}</span>
              {page.is_published && page.page_id && (
                <a
                  href={`${BACKEND_URL}/${user_id}/${page.page_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  /{user_id}/{page.page_id}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
          {isOwn && (
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <DownloadButton
                fileName={page.title || page.page_id}
                getContent={() => getPage(page.id).then((res) => res.data.html_content)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/generator?pageId=${page.id}`)}
              >
                <Pencil className="size-4" />
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(page)}
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
