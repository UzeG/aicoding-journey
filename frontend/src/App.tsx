import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppHeader from './components/layout/AppHeader'
import HomeView from './views/HomeView'
import GeneratorView from './views/GeneratorView'
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

import { useAuthStore } from './stores/auth'

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/generator" element={<GeneratorView />} />
            <Route path="/home" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginView />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewView />} />
              <Route path="users" element={<AdminUsersView />} />
              <Route path="users/:id" element={<AdminUserDetailView />} />
              <Route path="pages" element={<AdminPagesView />} />
              <Route path="pages/:pk" element={<AdminPageDetailView />} />
              <Route path="traces" element={<AdminTracesView />} />
              <Route path="traces/:id" element={<AdminTraceDetailView />} />
              <Route path="audit-logs" element={<AdminAuditLogsView />} />
              <Route path="llm-configs" element={<AdminLLMConfigsView />} />
              <Route path="system-prompts" element={<AdminSystemPromptsView />} />
              <Route path="test-bench" element={<AdminTestBenchView />} />
            </Route>

            <Route path="/:userId" element={<UserProfileView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
