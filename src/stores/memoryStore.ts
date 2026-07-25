import { create } from 'zustand'
import type { MemoryEntry } from '@/types/kilo'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'

/**
 * 记忆库状态管理
 *
 * 管理 KiloCode 的项目记忆条目
 * AI 自动记录工作上下文和用户偏好
 * 与 kiloClient memory API 真实对接
 */

interface MemoryState {
  /** 记忆条目列表 */
  entries: MemoryEntry[]
  /** 是否已加载 */
  loaded: boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null

  /** 加载记忆条目 */
  loadEntries: () => Promise<void>
  /** 添加记忆条目 */
  addEntry: (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  /** 删除记忆条目 */
  removeEntry: (id: string) => Promise<void>
  /** 搜索记忆条目 */
  searchEntries: (query: string) => Promise<void>
  /** 重置状态 */
  reset: () => void
}

/** 模拟记忆数据（未连接 CLI 时的演示） */
const MOCK_ENTRIES: MemoryEntry[] = [
  {
    id: 'mem-1',
    key: 'preferred_language',
    value: 'TypeScript',
    category: 'preference',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mem-2',
    key: 'project_framework',
    value: 'React + Vite + Electron',
    category: 'context',
    createdAt: new Date(Date.now() - 72000000).toISOString(),
    updatedAt: new Date(Date.now() - 72000000).toISOString(),
  },
  {
    id: 'mem-3',
    key: 'state_management',
    value: '使用 Zustand 进行状态管理，避免 Redux 的样板代码',
    category: 'decision',
    createdAt: new Date(Date.now() - 36000000).toISOString(),
    updatedAt: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    id: 'mem-4',
    key: 'brand_color',
    value: '#FFD700 (KiloCode Yellow)',
    category: 'fact',
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    updatedAt: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    id: 'mem-5',
    key: 'theme_preference',
    value: '支持 dark/light/system 三种模式，默认 dark',
    category: 'preference',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
]

const initialState = {
  entries: [] as MemoryEntry[],
  loaded: false,
  isLoading: false,
  error: null as string | null,
}

export const useMemoryStore = create<MemoryState>()((set, get) => ({
  ...initialState,

  loadEntries: async () => {
    const connected = useConnectionStore.getState().connected
    set({ isLoading: true, error: null })

    if (connected) {
      try {
        const entries = await kiloApi.listMemory()
        set({ entries, loaded: true, isLoading: false })
        return
      } catch (err) {
        console.error('[memoryStore.loadEntries] API failed:', err)
        // 降级到模拟数据
      }
    }

    // 模拟模式
    await new Promise((r) => setTimeout(r, 300))
    set({ entries: MOCK_ENTRIES, loaded: true, isLoading: false })
  },

  addEntry: async (entry) => {
    const connected = useConnectionStore.getState().connected

    if (connected) {
      try {
        const newEntry = await kiloApi.addMemory(entry)
        set((s) => ({ entries: [newEntry, ...s.entries] }))
        return
      } catch (err) {
        console.error('[memoryStore.addEntry] API failed:', err)
      }
    }

    // 降级：本地添加
    const localEntry: MemoryEntry = {
      ...entry,
      id: `mem-local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => ({ entries: [localEntry, ...s.entries] }))
  },

  removeEntry: async (id: string) => {
    const connected = useConnectionStore.getState().connected

    // 乐观删除
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))

    if (connected) {
      try {
        await kiloApi.removeMemory(id)
      } catch (err) {
        console.error('[memoryStore.removeEntry] API failed, restoring:', err)
        // 回滚
        await get().loadEntries()
      }
    }
  },

  searchEntries: async (query: string) => {
    if (!query.trim()) {
      await get().loadEntries()
      return
    }

    const connected = useConnectionStore.getState().connected

    if (connected) {
      try {
        const entries = await kiloApi.searchMemory(query)
        set({ entries })
        return
      } catch (err) {
        console.error('[memoryStore.searchEntries] API failed:', err)
      }
    }

    // 本地搜索
    const allEntries = get().entries.length > 0 ? get().entries : MOCK_ENTRIES
    const filtered = allEntries.filter(
      (e) =>
        e.key.toLowerCase().includes(query.toLowerCase()) ||
        e.value.toLowerCase().includes(query.toLowerCase())
    )
    set({ entries: filtered })
  },

  reset: () => set(initialState),
}))
