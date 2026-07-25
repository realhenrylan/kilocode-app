import { create } from 'zustand'
import type { PermissionRequest, PermissionDecision } from '@/types/kilo'

/**
 * 连接状态管理
 *
 * 管理 CLI 连接状态、权限请求等
 */
interface ConnectionState {
  /** CLI 是否已连接 */
  connected: boolean
  /** CLI 服务端口 */
  port: number
  /** 连接错误信息 */
  error: string | null
  /** 待处理的权限请求 */
  pendingPermissions: PermissionRequest[]
  /** 是否正在重连 */
  reconnecting: boolean

  // Actions
  setConnected: (connected: boolean) => void
  setPort: (port: number) => void
  setError: (error: string | null) => void
  addPermissionRequest: (request: PermissionRequest) => void
  removePermissionRequest: (id: string) => void
  setReconnecting: (reconnecting: boolean) => void
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  connected: false,
  port: 4096,
  error: null,
  pendingPermissions: [],
  reconnecting: false,

  setConnected: (connected) => set({ connected }),
  setPort: (port) => set({ port }),
  setError: (error) => set({ error }),
  addPermissionRequest: (request) => set((s) => ({
    pendingPermissions: [...s.pendingPermissions, request],
  })),
  removePermissionRequest: (id) => set((s) => ({
    pendingPermissions: s.pendingPermissions.filter((p) => p.id !== id),
  })),
  setReconnecting: (reconnecting) => set({ reconnecting }),
}))
