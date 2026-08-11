import { create } from 'zustand'
import { getMe, login as apiLogin, register as apiRegister } from '../api/endpoints'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, nickname?: string) => Promise<void>
  fetchUser: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,

  login: async (phone, password) => {
    const res = await apiLogin(phone, password)
    localStorage.setItem('access_token', res.data.access_token)
    set({ isAuthenticated: true })
  },

  register: async (phone, password, nickname) => {
    const res = await apiRegister(phone, password, nickname)
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
