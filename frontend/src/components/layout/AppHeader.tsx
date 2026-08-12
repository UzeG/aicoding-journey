import { Link, useNavigate } from 'react-router-dom'
import { Zap, FileText, Settings, LogOut, LogIn, LayoutGrid } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

function useNavItems(userId?: string | null) {
  return [
    { to: '/', label: '首页', icon: LayoutGrid },
    { to: userId ? `/${userId}` : '/login', label: '我的页面', icon: FileText, auth: true },
    { to: '/settings', label: '设置', icon: Settings },
  ]
}

export default function AppHeader() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const navItems = useNavItems(user?.user_id)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground no-underline">
          <span className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" fill="currentColor" />
          </span>
          HTML Host
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {navItems
            .filter((item) => !item.auth || isAuthenticated)
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md no-underline text-muted-foreground',
                  'hover:text-foreground hover:bg-accent transition-colors'
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">{user?.nickname || user?.phone}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" />
                退出
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">
                <LogIn className="size-4" />
                登录
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
