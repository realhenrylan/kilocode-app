import { ChatPanel } from '@/components/chat/ChatPanel'
import { Composer } from '@/components/composer/Composer'
import { StreamingIndicator } from '@/components/chat/StreamingIndicator'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * 中间主面板
 *
 * 包含对话区域 + 底部输入栏
 * Codex风格：消息流占据主要空间，Composer固定在底部
 */
export function MainPanel() {
  const { isStreaming } = useSessionStore()

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 对话消息流 */}
      <div className="flex-1 overflow-y-auto">
        <ChatPanel />
      </div>

      {/* 流式输出指示器 */}
      {isStreaming && <StreamingIndicator />}

      {/* 底部输入栏 */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        <Composer />
      </div>
    </div>
  )
}
