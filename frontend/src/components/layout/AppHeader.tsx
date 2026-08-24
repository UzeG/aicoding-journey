import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, LogIn, User, FolderOpen, Settings, Shield, LayoutGrid, SquarePen, Home, Zap } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import Avatar from '../common/Avatar'

/** 气泡导航通用 hover/active 动效：hover 阴影加深（respect reduced-motion） */
const BUBBLE = 'transition-all duration-200 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:shadow-sm'
const BUBBLE_SURFACE = 'bg-card/80 backdrop-blur ring-1 ring-border/60 shadow-sm'

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
    <header className="sticky top-0 z-50 py-3">
      <div className="px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* 左：logo bubble */}
        <Link
          to="/"
          className={cn(
            'justify-self-start inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-foreground no-underline',
            BUBBLE_SURFACE, BUBBLE
          )}
        >
          <span className="inline-flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground">
            <Zap className="size-3.5" fill="currentColor" />
          </span>
          <span className="hidden sm:inline text-sm font-bold tracking-tight">Manifest</span>
        </Link>

        {/* 中：tab bubble 组（active 填充主题色 pill） */}
        <nav className={cn('inline-flex items-center gap-1 rounded-full p-1', BUBBLE_SURFACE, BUBBLE)}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent motion-reduce:transition-none'
              )
            }
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">首页</span>
          </NavLink>
          <NavLink
            to="/gallery"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent motion-reduce:transition-none'
              )
            }
          >
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">作品广场</span>
          </NavLink>
          <NavLink
            to="/creation"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent motion-reduce:transition-none'
              )
            }
          >
            <SquarePen className="size-4" />
            <span className="hidden sm:inline">创作</span>
          </NavLink>
        </nav>

        {/* 右：个人 bubble（头像胶囊 / 登录按钮） */}
        <div className="justify-self-end flex items-center">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="用户菜单"
                className={cn('flex items-center rounded-full p-1', BUBBLE_SURFACE, BUBBLE)}
              >
                <Avatar
                  src={user?.avatar_url}
                  name={user?.nickname || user?.phone}
                  className="size-8 text-sm"
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
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
            <Button size="sm" className={cn('rounded-full', BUBBLE)} asChild>
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
