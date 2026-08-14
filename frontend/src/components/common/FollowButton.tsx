import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserCheck, UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuthStore } from '../../stores/auth'
import { followUser, unfollowUser } from '../../api/endpoints'

interface Props {
  /** user_id of the target profile / list item. */
  targetUserId: string
  isFollowing: boolean
  /** Current follower count of the target — used for optimistic ±1. */
  followerCount: number
  /** Called after each (optimistic) state change with the authoritative server values. */
  onChange: (isFollowing: boolean, followerCount: number) => void
  size?: 'default' | 'sm'
  className?: string
}

export default function FollowButton({ targetUserId, isFollowing, followerCount, onChange, size = 'default', className }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (busy) return
    setBusy(true)
    setError(null)
    // Optimistic flip; revert on failure
    onChange(!isFollowing, isFollowing ? followerCount - 1 : followerCount + 1)
    try {
      const res = isFollowing ? await unfollowUser(targetUserId) : await followUser(targetUserId)
      onChange(res.data.is_following, res.data.follower_count)
    } catch (err: any) {
      onChange(isFollowing, followerCount)
      setError(err.response?.data?.detail || '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <Button
        variant={isFollowing ? 'outline' : 'default'}
        size={size}
        onClick={handleClick}
        disabled={busy}
        className="w-full"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
        {isFollowing ? '已关注' : '关注'}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
