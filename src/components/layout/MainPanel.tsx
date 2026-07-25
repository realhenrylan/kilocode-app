import { ChatPanel } from '@/components/chat/ChatPanel'
import { Composer } from '@/components/composer/Composer'
import { StreamingIndicator } from '@/components/chat/StreamingIndicator'
import { useSessionStore } from '@/stores/sessionStore'
import { PanelRightOpen } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'

/**
 * 中间主面板（Codex V2.3 风格）
 *
 * - 顶部工具栏：面包屑 + 操作按钮，46px 高，底部发丝线
 * - 消息流居中(max-width 720px)
 * - Composer 浮起卡固定在底部
 */
export function MainPanel() {
  const { isStreaming, sessions, activeSessionId } = useSessionStore()
  const { rightPanelVisible, toggleRightPanel } = useUiStore()

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const crumbTitle = activeSession?.title || '新会话'

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* 顶部工具栏：面包屑 + 操作按钮 */}
      <div className="flex h-[46px] flex-shrink-0 items-center border-b border-[var(--divider)] px-4">
        <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[12.5px]">
          <span className="truncate font-medium text-[var(--text-secondary)]">{crumbTitle}</span>
          {activeSession?.forkedFrom && (
            <>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--text-tertiary)]">分叉自「{activeSession.forkedFrom}」</span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {!rightPanelVisible && (
            <button
              onClick={toggleRightPanel}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
              aria-label="打开工作面板"
            >
              <PanelRightOpen size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 对话消息流 */}
      <div className="flex-1 overflow-y-auto">
        <ChatPanel />
      </div>

      {/* 流式输出指示器 — 在消息列内显示 */}
      {isStreaming && <StreamingIndicator />}

      {/* Composer 浮起卡 */}
      <Composer />
    </div>
  )
}
