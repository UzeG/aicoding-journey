import { create } from 'zustand'

interface ProgressState {
  visible: boolean
  /** 0-100，进行中模拟推进，done 时置 100 */
  value: number
  start: () => void
  setValue: (v: number) => void
  done: () => void
}

let timer: number | null = null

/**
 * 全局顶部加载进度条状态（GitHub 风格）。
 * start() 从 8% 快速推进到 ~90% 后停滞；done() 置 100% 后淡出。
 * 深浅色由组件用 var(--primary) 自动适配。
 */
export const useProgressStore = create<ProgressState>((set) => ({
  visible: false,
  value: 0,

  start: () => {
    if (timer) window.clearInterval(timer)
    set({ visible: true, value: 8 })
    timer = window.setInterval(() => {
      set((s) => ({ value: s.value < 90 ? s.value + 8 : s.value }))
    }, 150)
  },

  setValue: (v) => set({ value: v }),

  done: () => {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
    set({ value: 100 })
    window.setTimeout(() => set({ visible: false, value: 0 }), 350)
  },
}))
