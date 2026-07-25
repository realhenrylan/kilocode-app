import { useSessionStore } from '@/stores/sessionStore'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { MessageSquare } from 'lucide-react'
import { useEffect, useRef, useCallback } from 'react'

/**
 * 对话面板
 *
 * 显示消息流：用户消息 + AI回复 + 工具调用
 * Codex风格：消息流式展示，自动滚动到底部
 * 支持从任意消息分叉会话
 */
export function ChatPanel() {
  const { messages, isStreaming, streamingContent, activeSessionId, forkSession } = useSessionStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  /** 分叉会话回调 */
  const handleFork = useCallback((messageId: string) => {
    if (activeSessionId) {
      forkSession(activeSessionId, messageId)
    }
  }, [activeSessionId, forkSession])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  // 空状态
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex h-full justify-center overflow-y-auto">
        <EmptyState />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex h-full justify-center overflow-y-auto">
      <div className="flex w-full max-w-[720px] flex-col gap-[22px] px-6 pt-7 pb-3">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <UserMessage message={message} onFork={handleFork} />
            ) : (
              <AssistantMessage
                content={message.content}
                toolCalls={message.toolCalls}
                message={message}
                messageId={message.id}
                onFork={handleFork}
              />
            )}
          </div>
        ))}

        {/* 流式输出中的内容 */}
        {isStreaming && streamingContent && (
          <AssistantMessage
            content={streamingContent}
            isStreaming
          />
        )}
      </div>
    </div>
  )
}

/** 空状态欢迎页 */
function EmptyState() {
  return (
    <div className="flex h-full w-full max-w-[720px] flex-col items-center justify-center px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
          <span className="text-lg font-bold text-[var(--text-secondary)]">K</span>
        </div>
      </div>
      <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">KiloCode</h2>
      <p className="mb-8 text-sm text-[var(--text-tertiary)]">AI 驱动的编程助手</p>

      {/* 快捷操作建议 */}
      <div className="grid w-full max-w-md grid-cols-2 gap-2">
        {[
          { label: '编写代码', prompt: '帮我实现...' },
          { label: '修复 Bug', prompt: '帮我调试...' },
          { label: '代码审查', prompt: '审查这段代码...' },
          { label: '架构设计', prompt: '设计架构方案...' },
        ].map((item) => (
          <button
            key={item.label}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--bg-hover)]"
          >
            <p className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{item.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
