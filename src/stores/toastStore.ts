import { create } from 'zustand'

/**
 * Toast 通知状态管理
 *
 * 管理应用级 Toast 通知队列
 * 最多同时显示 3 条，自动消失（默认 3 秒）
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const duration = toast.duration ?? 3000
    const item: ToastItem = { ...toast, id, duration }

    set((s) => ({
      // 最多保留 3 条
      toasts: [...s.toasts.slice(-2), item],
    }))

    // 自动移除
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== id),
      }))
    }, duration)
  },

  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),
}))
