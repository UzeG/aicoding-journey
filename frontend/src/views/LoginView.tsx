import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Phone, Lock, User } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function LoginView() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(phone, password)
      } else {
        await register(phone, password, nickname || undefined)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
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
              <Label htmlFor="phone">手机号</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                  placeholder="13800138000"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            {mode === 'register' && (
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
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="text-primary hover:underline ml-1"
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </button>
          </p>

          <div className="mt-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            Demo 账号：13800138000 / 123456
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
