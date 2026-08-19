import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, BookOpen, Camera, CircleAlert, FileText, Pencil, SquarePen, User,
} from 'lucide-react'
import { deletePage, getUserActivity, getUserProfile, updateProfile, uploadAvatar } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'
import FollowButton from '../components/common/FollowButton'
import ContributionHeatmap from '../components/common/ContributionHeatmap'
import Markdown from '../components/common/Markdown'
import FollowList from '../components/user/FollowList'
import ProjectCard from '../components/user/ProjectCard'
import SettingsView from './SettingsView'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog'
import { cn } from '../lib/utils'
import type { ActivityResponse, PageItem, UserProfile } from '../types'

type Filter = 'all' | 'published' | 'draft'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '已部署' },
  { key: 'draft', label: '草稿' },
]

const TAB_KEYS = ['overview', 'projects', 'settings'] as const

// Extract readable message from axios error — FastAPI 422 detail is an array
function getErrorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail.map((d: any) => d.msg).filter(Boolean)
    return msgs.join('；') || fallback
  }
  return fallback
}

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [deleteTarget, setDeleteTarget] = useState<PageItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [activityYear, setActivityYear] = useState<number | null>(null)
  const [followDialog, setFollowDialog] = useState<'followers' | 'following' | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editReadme, setEditReadme] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOwnProfile = currentUser?.user_id?.toLowerCase() === userId?.toLowerCase()
  const rawTab = searchParams.get('tab')
  const tab = (TAB_KEYS as readonly string[]).includes(rawTab || '') ? (rawTab as string) : 'overview'

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    try {
      const res = await getUserProfile(userId)
      setProfile(res.data)
    } catch (err: any) {
      if (err.response?.status === 404) setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  // 切换用户时兜底关闭关注弹窗（避免从弹窗跳转他人主页后弹窗残留）
  useEffect(() => { setFollowDialog(null) }, [userId])

  // 活跃度数据 —— 仅 overview tab 加载；切年时保留旧数据避免闪烁，响应后覆盖
  const fetchActivity = useCallback((year?: number) => {
    if (!userId) return
    let alive = true
    getUserActivity(userId, year)
      .then((res) => { if (alive) setActivity(res.data) })
      .catch(() => { /* 降级：无活跃度时不展示热力图 */ })
    return () => { alive = false }
  }, [userId])

  useEffect(() => {
    if (tab !== 'overview') return
    fetchActivity(activityYear ?? undefined)
  }, [tab, activityYear, fetchActivity])

  const setTab = (key: string) => {
    const params = new URLSearchParams(searchParams)
    if (key === 'overview') params.delete('tab')
    else params.set('tab', key)
    setSearchParams(params, { replace: true })
  }

  const handleFollowChange = (isFollowing: boolean, followerCount: number) => {
    setProfile((prev) => prev ? { ...prev, is_following: isFollowing, follower_count: followerCount } : prev)
  }

  // 关闭关注弹窗时刷新 profile —— 弹窗内的关注/取关会改变自己主页的关注/粉丝计数
  const closeFollowDialog = () => {
    setFollowDialog(null)
    fetchProfile()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await deletePage(deleteTarget.id)
      setProfile((prev) => prev ? { ...prev, pages: prev.pages.filter((p) => p.id !== deleteTarget.id) } : prev)
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || '删除失败，请重试')
    } finally {
      setDeleteTarget(null)
    }
  }

  const openEdit = () => {
    setEditNickname(profile?.user.nickname || '')
    setEditBio(profile?.user.bio || '')
    setEditReadme(profile?.user.readme || '')
    setPreviewAvatarUrl(null)
    setPendingAvatarFile(null)
    setProfileError(null)
    setEditOpen(true)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Local preview only — actual upload happens on Save
    if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl)
    setPreviewAvatarUrl(URL.createObjectURL(file))
    setPendingAvatarFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError(null)
    try {
      let updated = (await updateProfile({ nickname: editNickname, bio: editBio, readme: editReadme })).data
      if (pendingAvatarFile) {
        const avatarRes = await uploadAvatar(pendingAvatarFile)
        updated = avatarRes.data // 包含最新 avatar_url
      }
      setUser(updated)
      setProfile((p) => p ? { ...p, user: { ...p.user, nickname: updated.nickname, bio: updated.bio, avatar_url: updated.avatar_url, readme: editReadme } } : p)
      if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl)
      setPreviewAvatarUrl(null)
      setPendingAvatarFile(null)
      setEditOpen(false)
    } catch (err: any) {
      setProfileError(getErrorMessage(err, '保存失败'))
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading) return <LoadingSpinner text="加载用户主页..." />

  if (notFound || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="size-16 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h1 className="text-2xl font-bold mb-2">用户不存在</h1>
        <p className="text-muted-foreground mb-6">未找到用户 @{userId}</p>
        <Button variant="outline" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    )
  }

  const pages = profile.pages
  const publishedCount = pages.filter((p) => p.is_published).length
  // 最新项目仅展示已发布页面（草稿由「项目」tab 的筛选区分）
  const latestProjects = pages.filter((p) => p.is_published).slice(0, 4)
  const filtered = pages.filter((p) => {
    if (filter === 'published') return p.is_published
    if (filter === 'draft') return !p.is_published
    return true
  })

  const TABS = [
    { key: 'overview', label: '首页' },
    { key: 'projects', label: '项目' },
    ...(isOwnProfile ? [{ key: 'settings', label: '设置' }] : []),
  ]

  return (
    <div>
      {/* Tab 栏 —— 全宽、sticky 在系统 header 下方（GitHub 风格） */}
      <div className="sticky top-[var(--header-height)] z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto h-(--profile-tab-height)">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* 左侧个人卡片（滚动时固定——吸附位置 = header + tab 栏高度 + 页面 py-8 间距） */}
          <aside className="md:w-64 shrink-0 md:self-start md:sticky md:top-[calc(var(--header-height)+var(--profile-tab-height)+1rem)]">
            <Avatar
              src={profile.user.avatar_url}
              name={profile.user.nickname || profile.user.user_id}
              className="size-24 text-3xl mb-4"
            />
            <h1 className="text-xl font-bold text-foreground break-words">{profile.user.nickname || profile.user.user_id}</h1>
            <p className="text-sm text-muted-foreground mb-4">@{profile.user.user_id}</p>
            {!isOwnProfile && (
              <FollowButton
                targetUserId={profile.user.user_id || ''}
                isFollowing={profile.is_following}
                followerCount={profile.follower_count}
                onChange={handleFollowChange}
                className="mb-4"
              />
            )}
            {profile.user.bio && <p className="text-sm text-foreground/80 mb-4 whitespace-pre-wrap">{profile.user.bio}</p>}
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <button onClick={() => setFollowDialog('followers')} className="hover:text-foreground transition-colors">
                {profile.follower_count} 关注者
              </button>
              <span>·</span>
              <button onClick={() => setFollowDialog('following')} className="hover:text-foreground transition-colors">
                {profile.following_count} 正在关注
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">{publishedCount} 个已发布页面</p>
            {isOwnProfile && (
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={openEdit}>
                  <Pencil className="size-4" />
                  编辑资料
                </Button>
              </div>
            )}
          </aside>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            {tab === 'overview' && (
              <div className="space-y-8">
                {profile.user.readme && (
                  <section>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                      <BookOpen className="size-4 text-muted-foreground" />
                      README.md
                    </h2>
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <Markdown content={profile.user.readme} />
                      </CardContent>
                    </Card>
                  </section>
                )}

                <section>
                  <h2 className="text-base font-semibold text-foreground mb-3">最新项目</h2>
                  {latestProjects.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground text-sm">暂无项目</CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {latestProjects.map((page) => (
                        <ProjectCard key={page.id} page={page} user_id={profile.user.user_id || ''} isOwn={isOwnProfile} onDelete={setDeleteTarget} />
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                    <Activity className="size-4 text-muted-foreground" />
                    活跃度
                  </h2>
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      {activity ? <ContributionHeatmap data={activity} onYearChange={setActivityYear} /> : <LoadingSpinner text="加载活跃度..." />}
                    </CardContent>
                  </Card>
                </section>
              </div>
            )}

            {tab === 'projects' && (
              <>
                {/* 发布/草稿筛选 + 上传 HTML（仅自己） */}
                {isOwnProfile && (
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {FILTERS.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setFilter(f.key)}
                          className={cn(
                            'px-3 py-1 rounded-full text-sm transition-colors',
                            filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <Button variant="outline" onClick={() => navigate('/creation')}>
                      <SquarePen className="size-4" />
                      去创作
                    </Button>
                  </div>
                )}

                {deleteError && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                    <CircleAlert className="size-4 shrink-0" />
                    {deleteError}
                  </div>
                )}

                {filtered.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <FileText className="size-12 mb-4 opacity-40" />
                      <p className="text-lg mb-4">
                        {isOwnProfile ? (filter === 'all' ? '还没有生成过页面' : '没有符合条件的页面') : '还没有部署过页面'}
                      </p>
                      {isOwnProfile && filter === 'all' && (
                        <div className="flex flex-col items-center gap-3">
                          <Button variant="outline" onClick={() => navigate('/creation')}>
                            <SquarePen className="size-4" />
                            去创作
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((page) => (
                      <ProjectCard key={page.id} page={page} user_id={profile.user.user_id || ''} isOwn={isOwnProfile} onDelete={setDeleteTarget} />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'settings' && <SettingsView />}
          </div>
        </div>
      </div>

      {/* 编辑资料弹窗 */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl)
            setPreviewAvatarUrl(null)
            setPendingAvatarFile(null)
            setProfileError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                src={previewAvatarUrl || profile.user.avatar_url}
                name={profile.user.nickname || profile.user.user_id}
                className="size-16 text-xl"
              />
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleAvatarChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="size-4" />
                  更换头像
                </Button>
                <p className="text-xs text-muted-foreground mt-1">支持 JPG/PNG/WebP/GIF，≤2MB</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} maxLength={50} placeholder="你的名称" />
            </div>

            <div className="space-y-2">
              <Label>简介</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="介绍一下自己（可选）"
              />
              <p className="text-xs text-muted-foreground text-right">{editBio.length}/160</p>
            </div>

            <div className="space-y-2">
              <Label>README.md</Label>
              <Textarea
                value={editReadme}
                onChange={(e) => setEditReadme(e.target.value)}
                maxLength={20000}
                rows={8}
                placeholder="用 Markdown 介绍你的主页，会展示在个人主页首页右侧（可选）"
              />
              <p className="text-xs text-muted-foreground text-right">{editReadme.length}/20000</p>
            </div>

            {profileError && (
              <p className="text-destructive text-sm">{profileError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除页面"
        message={`确定要删除「${deleteTarget?.title || '未命名页面'}」吗？已部署的链接将失效。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 关注者 / 正在关注 弹窗（由左侧资料卡计数触发） */}
      <Dialog
        open={followDialog !== null}
        onOpenChange={(open) => { if (!open) closeFollowDialog() }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{followDialog === 'following' ? '正在关注' : '关注者'}</DialogTitle>
            <DialogDescription>@{userId}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {followDialog && (
              <FollowList
                userId={userId!}
                type={followDialog}
                onNavigate={() => setFollowDialog(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
