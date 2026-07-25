import { useSessionStore } from '@/stores/sessionStore'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { ToolCallCard } from './ToolCallCard'
import { MessageSquare } from 'lucide-react'
import { useEffect, useRef } from 'react'

/**
 * 对话面板
 *
 * 显示消息流：用户消息 + AI回复 + 工具调用
 * Codex风格：消息流式展示，自动滚动到底部
 */
export function ChatPanel() {
  const { messages, isStreaming, streamingContent } = useSessionStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  // 空状态
  if (messages.length === 0 && !isStreaming) {
    return <EmptyState />
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <UserMessage message={message} />
            ) : (
              <AssistantMessage
                content={message.content}
                toolCalls={message.toolCalls}
                message={message}
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
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-muted)]">
        <div className="h-8 w-8 rounded-lg bg-[var(--brand-primary)] flex items-center justify-center">
          <span className="text-lg font-bold text-black">K</span>
        </div>
      </div>
      <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">KiloCode</h2>
      <p className="mb-8 text-sm text-[var(--text-tertiary)]">AI 驱动的编程助手</p>

      {/* 快捷操作建议 */}
      <div className="grid max-w-md grid-cols-2 gap-2">
        {[
          { label: '编写代码', prompt: '帮我实现...' },
          { label: '修复 Bug', prompt: '帮我调试...' },
          { label: '代码审查', prompt: '审查这段代码...' },
          { label: '架构设计', prompt: '设计架构方案...' },
        ].map((item) => (
          <button
            key={item.label}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--brand-subtle)]"
          >
            <p className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{item.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
