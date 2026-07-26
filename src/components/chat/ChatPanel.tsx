import { useSessionStore } from '@/stores/sessionStore'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { useEffect, useRef, useCallback } from 'react'
import { Bug, Code2, Layers3, ScanSearch, Sparkles } from 'lucide-react'

const EMPTY_PROMPTS = [
  { icon: Code2, label: '编写代码', prompt: '帮我实现...' },
  { icon: Bug, label: '修复 Bug', prompt: '帮我调试...' },
  { icon: ScanSearch, label: '代码审查', prompt: '审查这段代码...' },
  { icon: Layers3, label: '架构设计', prompt: '设计架构方案...' },
]

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
      <div className="kc-chat-scroll">
        <EmptyState />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="kc-chat-scroll">
      <div className="kc-chat-col">
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
    <div className="kc-empty-state">
      <div className="kc-empty-brand">
        <img src="/kilo-logo.svg" alt="" />
      </div>
      <h2 className="kc-empty-title">KiloCode</h2>
      <p className="kc-empty-subtitle">
        AI 驱动的编程助手 <span className="kc-empty-status"><Sparkles size={11} /> 随时待命</span>
      </p>

      <div className="kc-empty-prompts">
        {EMPTY_PROMPTS.map((item) => (
          <button
            key={item.label}
            className="kc-prompt-card"
          >
            <span className="kc-prompt-icon"><item.icon size={16} /></span>
            <span className="kc-prompt-copy">
              <span className="kc-prompt-title">{item.label}</span>
              <span className="kc-prompt-caption">{item.prompt}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
