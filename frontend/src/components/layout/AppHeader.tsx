import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function AppHeader() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 no-underline">
          <span className="text-emerald-600 text-2xl">⚡</span>
          HTML Host
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900 no-underline">首页</Link>
          {isAuthenticated && (
            <Link to="/mypages" className="text-gray-600 hover:text-gray-900 no-underline">我的页面</Link>
          )}
          <Link to="/settings" className="text-gray-600 hover:text-gray-900 no-underline">设置</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-600">{user?.nickname || user?.phone}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded border border-gray-200 hover:border-gray-300"
              >
                退出
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded no-underline"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
