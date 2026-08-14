import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, LogIn, User, FolderOpen, Settings, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { Button } from '../ui/button'
import Avatar from '../common/Avatar'

export default function AppHeader() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  const goTo = (to: string) => {
    setMenuOpen(false)
    navigate(to)
  }

  const menuItems = [
    ...(user?.is_admin ? [{ to: '/admin', label: '后台管理', icon: Shield }] : []),
    { to: `/${user?.user_id}`, label: '我的主页', icon: User },
    { to: `/${user?.user_id}?tab=projects`, label: '我的项目', icon: FolderOpen },
    { to: `/${user?.user_id}?tab=settings`, label: '设置', icon: Settings },
  ]

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-(--header-height) flex items-center justify-between">
        <Link to="/" className="flex items-center text-foreground no-underline">
          <span className="text-base font-bold tracking-tight">Ship</span>
        </Link>

        <div className="flex items-center">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center rounded-full hover:ring-2 hover:ring-primary/30 transition-shadow"
                aria-label="用户菜单"
              >
                <Avatar
                  src={user?.avatar_url}
                  name={user?.nickname || user?.phone}
                  className="size-8 text-sm"
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="font-medium text-sm text-foreground truncate">{user?.nickname || user?.phone}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user?.user_id}</p>
                  </div>

                  <div className="py-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => goTo(item.to)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
                      >
                        <item.icon className="size-4 text-muted-foreground" />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <LogOut className="size-4 text-muted-foreground" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
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
