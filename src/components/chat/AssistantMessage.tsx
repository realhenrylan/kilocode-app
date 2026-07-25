import { cn } from '@/utils/cn'
import { ToolCallCard } from './ToolCallCard'
import { CodeBlock } from '@/components/common/CodeBlock'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { GitBranch } from 'lucide-react'
import type { KiloToolCall, KiloMessage } from '@/types/kilo'

/**
 * AI 助手消息组件
 *
 * Codex风格：左对齐，Markdown渲染 + 代码高亮 + 工具调用卡片
 * 流式输出时显示光标闪烁，底部显示 token 用量元数据
 * Hover 时显示分叉按钮，支持从此消息分叉会话
 */
export function AssistantMessage({
  content,
  toolCalls,
  isStreaming,
  message,
  messageId,
  onFork,
}: {
  content: string
  toolCalls?: KiloToolCall[]
  isStreaming?: boolean
  /** 完整消息对象，用于提取元数据（token 用量、耗时等） */
  message?: KiloMessage
  /** 消息 ID，用于分叉定位 */
  messageId?: string
  /** 分叉回调 */
  onFork?: (messageId: string) => void
}) {
  const tokenUsage = message?.metadata?.tokenUsage
  const duration = message?.metadata?.duration

  return (
    <div className="group relative flex justify-start">
      {/* Hover 分叉按钮 */}
      {onFork && messageId && !isStreaming && (
        <button
          onClick={() => onFork(messageId)}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-tertiary)] opacity-0 transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] group-hover:opacity-100"
          aria-label="从此消息分叉"
          title="从此消息分叉会话"
        >
          <GitBranch size={14} />
        </button>
      )}
      <div className="max-w-[90%] space-y-2 text-[13px] leading-[1.7] text-[var(--text-primary)]">
        {/* 工具调用展示 */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-1">
            {toolCalls.map((call) => (
              <ToolCallCard key={call.id} toolCall={call} />
            ))}
          </div>
        )}

        {/* Markdown 内容 */}
        {content && (
          <div className="prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const isInline = !className
                  const code = String(children).replace(/\n$/, '')

                  if (isInline) {
                    return (
                      <code
                        className="rounded bg-[var(--code-bg)] px-1 py-0.5 text-xs text-[var(--accent)]"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }

                  const language = className?.replace('language-', '') || ''
                  return <CodeBlock code={code} language={language} />
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                },
                pre({ children }) {
                  return <div className="my-2">{children}</div>
                },
                a({ href, children }) {
                  return (
                    <a href={href} className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener">
                      {children}
                    </a>
                  )
                },
              }}
            >
              {content}
            </ReactMarkdown>

            {/* 流式输出光标 */}
            {isStreaming && (
              <span className="inline-block h-4 w-0.5 animate-pulse bg-[var(--brand-primary)]" />
            )}
          </div>
        )}

        {/* Token 用量元数据 — 中性色，去品牌黄 */}
        {!isStreaming && tokenUsage && (
          <div className="flex items-center gap-3 text-[11.5px] text-[var(--text-tertiary)]">
            <span>↑ {tokenUsage.inputTokens?.toLocaleString() ?? tokenUsage.input?.toLocaleString() ?? '—'}</span>
            <span>↓ {tokenUsage.outputTokens?.toLocaleString() ?? tokenUsage.output?.toLocaleString() ?? '—'}</span>
            {tokenUsage.cost != null && tokenUsage.cost > 0 && (
              <span>
                ${tokenUsage.cost < 0.001 ? tokenUsage.cost.toFixed(6) : tokenUsage.cost < 0.01 ? tokenUsage.cost.toFixed(4) : tokenUsage.cost.toFixed(2)}
              </span>
            )}
            {duration != null && (
              <span>{duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
