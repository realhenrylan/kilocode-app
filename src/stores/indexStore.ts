import { create } from 'zustand'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'

/**
 * 代码库索引状态管理
 *
 * 管理代码库索引的构建状态、文件数量等信息
 * 支持手动触发索引构建
 */

interface IndexState {
  /** 是否已索引 */
  indexed: boolean
  /** 已索引文件数量 */
  fileCount: number
  /** 最后索引时间 */
  lastIndexed: string | null
  /** 是否正在构建索引 */
  isBuilding: boolean
  /** 构建进度（0-100） */
  buildProgress: number
  /** 错误信息 */
  error: string | null

  /** 加载索引状态 */
  loadIndexStatus: () => Promise<void>
  /** 触发索引构建 */
  triggerIndexing: () => Promise<void>
  /** 重置状态 */
  reset: () => void
}

const initialState = {
  indexed: false,
  fileCount: 0,
  lastIndexed: null as string | null,
  isBuilding: false,
  buildProgress: 0,
  error: null as string | null,
}

export const useIndexStore = create<IndexState>()((set, get) => ({
  ...initialState,

  loadIndexStatus: async () => {
    const connected = useConnectionStore.getState().connected
    if (!connected) {
      // 未连接时使用模拟数据
      set({
        indexed: false,
        fileCount: 0,
        lastIndexed: null,
      })
      return
    }

    try {
      const status = await kiloApi.getIndexStatus()
      set({
        indexed: status.indexed,
        fileCount: status.fileCount,
        lastIndexed: status.lastIndexed,
        error: null,
      })
    } catch (err) {
      console.error('[loadIndexStatus] Failed:', err)
      set({ error: '获取索引状态失败' })
    }
  },

  triggerIndexing: async () => {
    const connected = useConnectionStore.getState().connected
    if (!connected) {
      // 模拟索引构建过程
      set({ isBuilding: true, buildProgress: 0, error: null })
      for (let i = 0; i <= 100; i += 5) {
        await new Promise((r) => setTimeout(r, 100))
        set({ buildProgress: i })
      }
      set({
        isBuilding: false,
        buildProgress: 100,
        indexed: true,
        fileCount: 42,
        lastIndexed: new Date().toISOString(),
      })
      return
    }

    try {
      set({ isBuilding: true, buildProgress: 0, error: null })
      await kiloApi.triggerIndexing()
      // 构建完成后刷新状态
      // 简单模拟进度（实际应通过 SSE 事件获取）
      const progressInterval = setInterval(() => {
        const { buildProgress } = get()
        if (buildProgress < 90) {
          set({ buildProgress: buildProgress + 10 })
        }
      }, 500)

      // 等待一段时间后检查状态
      setTimeout(async () => {
        clearInterval(progressInterval)
        await get().loadIndexStatus()
        set({ isBuilding: false, buildProgress: 100 })
      }, 5000)
    } catch (err) {
      console.error('[triggerIndexing] Failed:', err)
      set({ isBuilding: false, error: '索引构建失败' })
    }
  },

  reset: () => set(initialState),
}))
