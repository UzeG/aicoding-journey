import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Phone, Lock, User, AtSign, Check, X, Camera, Trash2, Zap } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { checkUserId, uploadAvatar } from '../api/endpoints'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import Avatar from '../components/common/Avatar'
import IdentityCard from '../components/login/IdentityCard'

const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
// 发布页路径（/{user}/{page} 两段，排除 admin/api/static）——与 vite proxy 正则一致
const PUBLISHED_PAGE_RE = /^\/(?!admin|api|static)[a-zA-Z0-9_-]{3,30}\/[a-zA-Z0-9_-]{1,50}$/

export default function LoginView() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [userId, setUserId] = useState('')
  const [userIdStatus, setUserIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 头像：本地预览 + 待上传文件（注册可选）
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const { login, register, fetchUser } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 返回上一地址：优先 redirect（进入登录页的原始地址），否则浏览器历史回退，兜底首页
  const handleBack = () => {
    if (redirect && redirect.startsWith('/')) {
      const pathOnly = redirect.split('?')[0]
      if (PUBLISHED_PAGE_RE.test(pathOnly)) {
        window.location.href = redirect
      } else {
        navigate(redirect)
      }
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const validateUserId = useCallback((val: string) => {
    if (!val) {
      setUserIdStatus('idle')
      return
    }
    if (!USER_ID_PATTERN.test(val)) {
      setUserIdStatus('invalid')
      return
    }
    setUserIdStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkUserId(val)
        setUserIdStatus(res.data.available ? 'available' : 'taken')
      } catch {
        setUserIdStatus('idle')
      }
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl)
    }
  }, [previewAvatarUrl])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重选同一文件
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) {
      setError('头像需小于 2MB')
      return
    }
    if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl)
    setPreviewAvatarUrl(URL.createObjectURL(file))
    setPendingAvatarFile(file)
  }

  const clearAvatar = () => {
    if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl)
    setPreviewAvatarUrl(null)
    setPendingAvatarFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(account, password)
      } else {
        if (!userId.trim()) { setError('请输入用户 ID'); setLoading(false); return }
        if (userIdStatus !== 'available') { setError('请检查用户 ID 是否可用'); setLoading(false); return }
        await register(account, password, userId, nickname || undefined)
        // 注册成功即有 token → 可立即上传头像（可选，失败不阻塞登录）
        if (pendingAvatarFile) {
          try { await uploadAvatar(pendingAvatarFile) } catch { /* 头像失败不影响登录 */ }
        }
      }
      // Load user data before navigating so header avatar/menu shows correctly
      await fetchUser()
      if (redirect && redirect.startsWith('/')) {
        // 发布页（/{user}/{page} 两段）是后端渲染的非 React 路由，必须整页跳回；
        // 其余是 SPA 路由，用 navigate() 跳回（保留 Zustand store，如 /creation 上传的本地内容）
        const pathOnly = redirect.split('?')[0]
        const isPublishedPage = PUBLISHED_PAGE_RE.test(pathOnly)
        if (isPublishedPage) {
          window.location.href = redirect
        } else {
          navigate(redirect)
        }
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setUserIdStatus('idle')
    setUserId('')
    clearAvatar()
  }

  // 注册模式下头像预览：未选图用昵称/手机号首字母
  const previewName = nickname.trim() || account.trim() || ''
  const isRegister = mode === 'register'

  return (
    <>
      {/* 登录页全屏无 header：右上角固定返回入口（回上一地址，不一定是首页） */}
      <button
        type="button"
        onClick={handleBack}
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <ArrowLeft className="size-4" />
        返回
      </button>
    <div className="flex-1 flex min-h-0">
      {/* 左：品牌 + 实时身份卡（lg+） */}
      <IdentityCard
        mode={mode}
        avatarSrc={previewAvatarUrl}
        name={previewName}
        userId={userId}
        phone={account}
      />

      {/* 右：认证表单 */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            {/* 移动端品牌条 */}
            <div className="lg:hidden text-center mb-7">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground mb-3">
                <Zap className="size-6" fill="currentColor" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {isRegister ? '创建你的数字名片' : '欢迎回到 Manifest'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">一句话 · 一个网页</p>
            </div>

            <Card>
              <CardContent className="p-6 sm:p-8">
                {/* 注册模式：头像选择（可选，未设置用首字母） */}
                {isRegister && (
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      title="设置头像"
                      className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Avatar
                        src={previewAvatarUrl}
                        name={previewName}
                        className="size-16 text-2xl ring-2 ring-border transition-shadow group-hover:ring-primary/50"
                      />
                      <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Camera className="size-6 text-transparent group-hover:text-white" />
                      </span>
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">你的头像</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {previewAvatarUrl ? '已选择，上传后立即生效' : '未设置时显示名字首字母'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Camera className="size-3" />
                          {previewAvatarUrl ? '更换' : '选择图片'}
                        </button>
                        {previewAvatarUrl && (
                          <button
                            type="button"
                            onClick={clearAvatar}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                            移除
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarChange}
                    />
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">{isRegister ? '手机号' : '手机号 / 用户 ID'}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="account"
                        type="text"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        maxLength={isRegister ? 11 : 30}
                        placeholder={isRegister ? '请输入手机号' : '手机号或用户 ID'}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {isRegister && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="user_id">用户 ID</Label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="user_id"
                            type="text"
                            value={userId}
                            onChange={(e) => { setUserId(e.target.value); validateUserId(e.target.value) }}
                            maxLength={30}
                            placeholder="字母、数字、连字符、下划线，3-30 位"
                            required
                            className="pl-9"
                          />
                          {userIdStatus === 'checking' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                          {userIdStatus === 'available' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-success" />}
                          {userIdStatus === 'taken' && <X className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-destructive" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {userIdStatus === 'idle' && '设置后可通过该 ID 登录，注册后不可修改'}
                          {userIdStatus === 'checking' && '正在检查...'}
                          {userIdStatus === 'available' && '该 ID 可用'}
                          {userIdStatus === 'taken' && '已被占用，请换一个'}
                          {userIdStatus === 'invalid' && '格式：字母、数字、连字符、下划线，3-30 位'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nickname">昵称（可选）</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="如何称呼你"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="至少 6 位"
                        minLength={6}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {error && <p className="text-destructive text-sm">{error}</p>}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {loading ? '处理中...' : isRegister ? '创建账号' : '登录'}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  {isRegister ? '已有账号？' : '还没有账号？'}
                  <button
                    onClick={switchMode}
                    className="text-primary hover:underline ml-1"
                  >
                    {isRegister ? '去登录' : '去注册'}
                  </button>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
