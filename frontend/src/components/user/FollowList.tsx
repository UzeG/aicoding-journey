import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { getFollowers, getFollowing } from '../../api/endpoints'
import { useAuthStore } from '../../stores/auth'
import Avatar from '../common/Avatar'
import FollowButton from '../common/FollowButton'
import LoadingSpinner from '../common/LoadingSpinner'
import { Card, CardContent } from '../ui/card'
import type { FollowUserItem } from '../../types'

interface Props {
  userId: string
  type: 'followers' | 'following'
  /** Called when a user link is clicked — lets the parent close the dialog on navigation. */
  onNavigate?: () => void
}

export default function FollowList({ userId, type, onNavigate }: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const [items, setItems] = useState<FollowUserItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setItems(null)
    setError(null)
    const fn = type === 'followers' ? getFollowers : getFollowing
    fn(userId)
      .then((res) => {
        if (alive) setItems(res.data)
      })
      .catch((err: any) => {
        if (alive) setError(err.response?.data?.detail || '加载失败')
      })
    return () => {
      alive = false
    }
  }, [userId, type])

  const updateItem = (id: string, isFollowing: boolean) => {
    setItems((prev) =>
      prev ? prev.map((it) => (it.id === id ? { ...it, is_following: isFollowing } : it)) : prev
    )
  }

  if (error) return <p className="text-destructive text-sm">{error}</p>
  if (!items) return <LoadingSpinner text="加载中..." />

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <UserRound className="size-10 mb-3 opacity-40" />
          <p>{type === 'followers' ? '还没有关注者' : '还没有关注任何人'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((u) => (
        <Card key={u.id} className="hover:border-primary/40 transition-colors">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <Link to={`/${u.user_id}`} onClick={onNavigate} className="flex items-center gap-3 min-w-0 no-underline">
              <Avatar src={u.avatar_url} name={u.nickname || u.user_id} className="size-10 text-sm shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{u.nickname || u.user_id}</p>
                <p className="text-xs text-muted-foreground truncate">@{u.user_id}</p>
              </div>
            </Link>
            {u.id !== currentUser?.id && (
              <FollowButton
                targetUserId={u.user_id}
                isFollowing={u.is_following}
                followerCount={0}
                onChange={(isFollowing) => updateItem(u.id, isFollowing)}
                size="sm"
                className="w-24 shrink-0"
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
