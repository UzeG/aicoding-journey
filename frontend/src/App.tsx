import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppHeader from './components/layout/AppHeader'
import HomeView from './views/HomeView'
import GeneratorView from './views/GeneratorView'
import UserProfileView from './views/UserProfileView'
import LoginView from './views/LoginView'

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

            <Route path="/:userId" element={<UserProfileView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
