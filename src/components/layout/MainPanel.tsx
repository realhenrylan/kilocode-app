import { ChatPanel } from '@/components/chat/ChatPanel'
import { Composer } from '@/components/composer/Composer'
import { StreamingIndicator } from '@/components/chat/StreamingIndicator'
import { useSessionStore } from '@/stores/sessionStore'
import { PanelLeft, PanelRightOpen } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'

/**
 * 中间主面板（Codex V2.3 风格）
 *
 * - 顶部工具栏：面包屑 + 操作按钮，46px 高，底部发丝线
 * - 消息流居中(max-width 720px)
 * - Composer 浮起卡固定在底部
 */
export function MainPanel() {
  const { isStreaming, sessions, activeSessionId, workingDir } = useSessionStore()
  const { rightPanelVisible, toggleRightPanel, toggleSidebar } = useUiStore()

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const crumbTitle = activeSession?.title || '新会话'
  const projectName = (activeSession?.workingDir || workingDir)?.split(/[\\/]/).pop()

  return (
    <div className="kc-main">
      {/* 顶部工具栏：面包屑 + 操作按钮 */}
      <div className="kc-main-top">
        <div className="kc-crumb">
          <span className="kc-crumb-app">KiloCode</span>
          <span className="kc-crumb-separator">/</span>
          <span className="truncate font-medium text-[var(--text-primary)]">{crumbTitle}</span>
          {projectName && <span className="kc-crumb-project">{projectName}</span>}
          {activeSession?.forkedFrom && (
            <>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--text-tertiary)]">分叉自「{activeSession.forkedFrom}」</span>
            </>
          )}
        </div>
        <div className="kc-top-actions">
          <button
            onClick={toggleSidebar}
            className="kc-icon-btn"
            aria-label="切换侧边栏"
          >
            <PanelLeft size={14} />
          </button>
          {!rightPanelVisible && (
            <button
              onClick={toggleRightPanel}
              className="kc-icon-btn"
              aria-label="打开工作面板"
            >
              <PanelRightOpen size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 对话消息流 */}
      <div className="kc-chat-host">
        <ChatPanel />
      </div>

      {/* 流式输出指示器 — 在消息列内显示 */}
      {isStreaming && <StreamingIndicator />}

      {/* Composer 浮起卡 */}
      <Composer />
    </div>
  )
}
