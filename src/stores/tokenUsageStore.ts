import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TokenUsage } from '@/types/kilo'

/**
 * Token 用量追踪状态管理
 *
 * 累计追踪当前会话的 Token 用量和成本
 * 每次 AI 回复完成后更新
 * 通过 persist 中间件持久化，应用重启后保留历史用量
 */

interface TokenUsageState {
  /** 当前会话累计 Token 用量 */
  usage: TokenUsage
  /** 历史总用量（所有会话） */
  totalUsage: TokenUsage
  /** 当前会话数 */
  sessionCount: number

  /** 记录一次 AI 回复的用量 */
  recordUsage: (usage: TokenUsage) => void
  /** 重置当前会话用量 */
  resetSessionUsage: () => void
  /** 重置所有用量 */
  resetAll: () => void
}

const emptyUsage: TokenUsage = {
  input: 0,
  output: 0,
  total: 0,
  cost: 0,
}

export const useTokenUsageStore = create<TokenUsageState>()(
  persist(
    (set, get) => ({
  usage: { ...emptyUsage },
  totalUsage: { ...emptyUsage },
  sessionCount: 0,

  recordUsage: (newUsage: TokenUsage) => {
    set((s) => ({
      usage: {
        input: s.usage.input + newUsage.input,
        output: s.usage.output + newUsage.output,
        cacheRead: (s.usage.cacheRead || 0) + (newUsage.cacheRead || 0),
        cacheWrite: (s.usage.cacheWrite || 0) + (newUsage.cacheWrite || 0),
        total: s.usage.total + newUsage.total,
        cost: (s.usage.cost || 0) + (newUsage.cost || 0),
      },
      totalUsage: {
        input: s.totalUsage.input + newUsage.input,
        output: s.totalUsage.output + newUsage.output,
        cacheRead: (s.totalUsage.cacheRead || 0) + (newUsage.cacheRead || 0),
        cacheWrite: (s.totalUsage.cacheWrite || 0) + (newUsage.cacheWrite || 0),
        total: s.totalUsage.total + newUsage.total,
        cost: (s.totalUsage.cost || 0) + (newUsage.cost || 0),
      },
    }))
  },

  resetSessionUsage: () => {
    set((s) => ({
      usage: { ...emptyUsage },
      sessionCount: s.sessionCount + 1,
    }))
  },

  resetAll: () => set({
    usage: { ...emptyUsage },
    totalUsage: { ...emptyUsage },
    sessionCount: 0,
  }),
}),
{
  name: 'kilocode-token-usage',
  /** 持久化总用量和会话数，当前会话用量不持久化（每次启动重置） */
  partialize: (state) => ({
    totalUsage: state.totalUsage,
    sessionCount: state.sessionCount,
  }),
}
  )
)

/** 格式化 Token 数量 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return `${count}`
}

/** 格式化成本 */
export function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`
  if (cost >= 0.01) return `$${cost.toFixed(3)}`
  if (cost > 0) return `$${cost.toFixed(4)}`
  return '$0'
}
