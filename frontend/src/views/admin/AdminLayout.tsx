import { Navigate, NavLink, Outlet } from 'react-router-dom'
import {
  Cpu,
  FileCode2,
  Files,
  FlaskConical,
  History,
  LayoutDashboard,
  ScrollText,
  Shield,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/admin', end: true, label: '概览', icon: LayoutDashboard },
  { to: '/admin/users', label: '用户', icon: Users },
  { to: '/admin/pages', label: '页面', icon: Files },
  { to: '/admin/traces', label: '生成轨迹', icon: History },
  { to: '/admin/audit-logs', label: '审计日志', icon: ScrollText },
  { to: '/admin/llm-configs', label: 'LLM 配置', icon: Cpu },
  { to: '/admin/system-prompts', label: '系统提示词', icon: FileCode2 },
  { to: '/admin/test-bench', label: '测试台', icon: FlaskConical },
]

export default function AdminLayout() {
  const { isAuthenticated, user, loading } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (loading || !user) return <LoadingSpinner />

  if (!user.is_admin) {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-sm">
          <Shield className="size-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">无权访问后台</p>
          <p className="mt-2 text-sm text-muted-foreground">当前账号没有管理员权限。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-8">
      <nav className="w-44 shrink-0 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors no-underline',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/60',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
