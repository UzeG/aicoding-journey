import { create } from 'zustand'
import { getMe, login as apiLogin, register as apiRegister } from '../api/endpoints'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (account: string, password: string) => Promise<void>
  register: (account: string, password: string, user_id: string, nickname?: string) => Promise<void>
  fetchUser: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,

  login: async (account, password) => {
    const res = await apiLogin(account, password)
    localStorage.setItem('access_token', res.data.access_token)
    set({ isAuthenticated: true })
  },

  register: async (phone, password, user_id, nickname) => {
    const res = await apiRegister(phone, password, user_id, nickname)
    localStorage.setItem('access_token', res.data.access_token)
    set({ isAuthenticated: true })
  },

  fetchUser: async () => {
    try {
      set({ loading: true })
      const res = await getMe()
      set({ user: res.data, isAuthenticated: true, loading: false })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, isAuthenticated: false, loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, isAuthenticated: false })
  },
}))
