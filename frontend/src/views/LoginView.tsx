import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Phone, Lock, User, AtSign, Check, X } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { checkUserId } from '../api/endpoints'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/

export default function LoginView() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [userId, setUserId] = useState('')
  const [userIdStatus, setUserIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, fetchUser } = useAuthStore()
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

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
      }
      // Load user data before navigating so header avatar/menu shows correctly
      await fetchUser()
      navigate('/')
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
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{mode === 'login' ? '欢迎回来' : '创建账号'}</CardTitle>
          <CardDescription>
            {mode === 'login' ? '登录后开始你的 AI 创作' : '注册后解锁全部功能'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">{mode === 'login' ? '手机号 / 用户 ID' : '手机号'}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="account"
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  maxLength={mode === 'login' ? 30 : 11}
                  placeholder={mode === 'login' ? '13800138000 或 myname' : '13800138000'}
                  required
                  className="pl-9"
                />
              </div>
            </div>

            {mode === 'register' && (
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
                    {userIdStatus === 'available' && '✅ 该 ID 可用'}
                    {userIdStatus === 'taken' && '❌ 已被占用，请换一个'}
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
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              onClick={switchMode}
              className="text-primary hover:underline ml-1"
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </button>
          </p>

          <div className="mt-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            Demo 账号：13800138000 或 demo / 123456
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
