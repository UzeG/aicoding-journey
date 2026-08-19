import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { cn } from './lib/utils'
import TopProgressBar from './components/common/TopProgressBar'
import { useProgressStore } from './stores/progress'
import AppHeader from './components/layout/AppHeader'
import HomeView from './views/HomeView'
import CreationView from './views/CreationView'
import GalleryView from './views/GalleryView'
import UserProfileView from './views/UserProfileView'
import LoginView from './views/LoginView'
import AdminLayout from './views/admin/AdminLayout'
import AdminOverviewView from './views/admin/AdminOverviewView'
import AdminUsersView from './views/admin/AdminUsersView'
import AdminUserDetailView from './views/admin/AdminUserDetailView'
import AdminPagesView from './views/admin/AdminPagesView'
import AdminPageDetailView from './views/admin/AdminPageDetailView'
import AdminTracesView from './views/admin/AdminTracesView'
import AdminTraceDetailView from './views/admin/AdminTraceDetailView'
import AdminAuditLogsView from './views/admin/AdminAuditLogsView'
import AdminLLMConfigsView from './views/admin/AdminLLMConfigsView'
import AdminSystemPromptsView from './views/admin/AdminSystemPromptsView'
import AdminTestBenchView from './views/admin/AdminTestBenchView'
import AdminChatView from './views/admin/AdminChatView'

import { useAuthStore } from './stores/auth'
import { activeAppearance, applyAppearance, cacheAppearance, cacheTheme, getCachedAppearance, getCachedTheme } from './lib/theme'

function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loading = useAuthStore((s) => s.loading)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (loading || !user) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">加载中...</p></div>
  }
  if (!user.user_id) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.user_id}`} replace />
}

export default function App() {
  const { fetchUser, isAuthenticated } = useAuthStore()
  const user = useAuthStore((s) => s.user)

  // 首帧用缓存的外观 + 主题色，避免刷新时闪默认
  useEffect(() => {
    applyAppearance(getCachedAppearance(), getCachedTheme())
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 用户加载后以服务端为准；登出（user 变 null）回落缓存/默认
  useEffect(() => {
    if (user) {
      const mode = activeAppearance(user.appearance)
      applyAppearance(mode, user.theme)
      cacheAppearance(mode)
      cacheTheme(user.theme ?? null)
    } else if (!isAuthenticated) {
      applyAppearance(getCachedAppearance(), null)
      cacheTheme(null)
    }
  }, [user?.appearance, user?.theme, isAuthenticated])

  return <RouterProvider router={router} />
}

/** 应用外壳：/login 独占全屏（无 header），其余页面带 header */
function AppLayout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login'
  const prevPath = useRef(location.pathname)

  // 路由切换 → 顶部进度条（GitHub 风格；SPA 切换快，给最短可见时长）
  useEffect(() => {
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname
    const p = useProgressStore.getState()
    p.start()
    window.setTimeout(() => p.done(), 250)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopProgressBar />
      {!isAuthPage && <AppHeader />}
      <main className={cn('flex-1', isAuthPage && 'flex flex-col')}>
        <Outlet />
      </main>
    </div>
  )
}

// data router（useBlocker 等需要）：迁移自 <BrowserRouter><Routes>，路由匹配按 path 特异性，
// /:userId 兜底放最后不会被 /creation 等遮蔽
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomeView /> },
      { path: '/creation', element: <CreationView /> },
      { path: '/gallery', element: <GalleryView /> },
      { path: '/home', element: <HomeRedirect /> },
      { path: '/login', element: <LoginView /> },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewView /> },
          { path: 'users', element: <AdminUsersView /> },
          { path: 'users/:id', element: <AdminUserDetailView /> },
          { path: 'pages', element: <AdminPagesView /> },
          { path: 'pages/:pk', element: <AdminPageDetailView /> },
          { path: 'traces', element: <AdminTracesView /> },
          { path: 'traces/:id', element: <AdminTraceDetailView /> },
          { path: 'audit-logs', element: <AdminAuditLogsView /> },
          { path: 'llm-configs', element: <AdminLLMConfigsView /> },
          { path: 'system-prompts', element: <AdminSystemPromptsView /> },
          { path: 'test-bench', element: <AdminTestBenchView /> },
          { path: 'chat', element: <AdminChatView /> },
        ],
      },
      { path: '/:userId', element: <UserProfileView /> },
    ],
  },
])
