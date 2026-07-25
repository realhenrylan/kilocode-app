import { useSessionStore } from '@/stores/sessionStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useTokenUsageStore, formatTokenCount, formatCost } from '@/stores/tokenUsageStore'
import { IndexStatus } from '@/components/common/IndexStatus'
import { cn } from '@/utils/cn'
import { Circle, Wifi, WifiOff, RefreshCw, Coins } from 'lucide-react'

/**
 * 底部状态栏
 *
 * Codex风格：极简状态栏，显示连接状态、模式、索引状态、Token用量、模型
 */
export function StatusBar() {
  const { currentMode, currentModel } = useSessionStore()
  const { connected, reconnecting, reconnect } = useConnectionStore()
  const { usage } = useTokenUsageStore()

  const hasUsage = usage.total > 0

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-[10px] text-[var(--text-tertiary)] select-none">
      {/* 左侧：连接状态 + 模式 + 索引 */}
      <div className="flex items-center gap-3">
        {/* 连接状态指示 */}
        <div className="flex items-center gap-1">
          {connected ? (
            <>
              <Wifi size={10} className="text-[var(--success)]" />
              <span>已连接</span>
            </>
          ) : reconnecting ? (
            <>
              <RefreshCw size={10} className="animate-spin text-[var(--warning)]" />
              <span>重连中...</span>
            </>
          ) : (
            <>
              <WifiOff size={10} className="text-[var(--error)]" />
              <button
                onClick={reconnect}
                className="text-[var(--error)] hover:underline"
              >
                未连接（点击重连）
              </button>
            </>
          )}
        </div>

        {/* 当前模式 */}
        <div className="flex items-center gap-1">
          <Circle size={6} className="fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
          <span className="capitalize">{currentMode}</span>
        </div>

        {/* 索引状态 */}
        <IndexStatus />
      </div>

      {/* 右侧：Token用量 + 模型信息 */}
      <div className="flex items-center gap-3">
        {/* Token 用量和成本 */}
        {hasUsage && (
          <div className="flex items-center gap-1" title={`输入: ${formatTokenCount(usage.input)} · 输出: ${formatTokenCount(usage.output)} · 缓存读: ${formatTokenCount(usage.cacheRead || 0)} · 总计: ${formatTokenCount(usage.total)}`}>
            <Coins size={10} className="text-[var(--brand-primary)]" />
            <span>{formatTokenCount(usage.total)} tokens</span>
            {usage.cost !== undefined && usage.cost > 0 && (
              <span className="text-[var(--brand-primary)]">{formatCost(usage.cost)}</span>
            )}
          </div>
        )}

        <span>{currentModel}</span>
      </div>
    </div>
  )
}
