import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import AppHeader from './components/layout/AppHeader'
import HomeView from './views/HomeView'
import GeneratorView from './views/GeneratorView'
import MyPagesView from './views/MyPagesView'
import LoginView from './views/LoginView'
import SettingsView from './views/SettingsView'
import PublishedPageView from './views/PublishedPageView'
import { useAuthStore } from './stores/auth'

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
            <Route path="/mypages" element={<MyPagesView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/published/:shortCode" element={<PublishedPageView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
