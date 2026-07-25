import { FileText, Image, GitBranch } from 'lucide-react'
import type { KiloMessage, FileAttachment } from '@/types/kilo'

/**
 * 用户消息组件
 *
 * Codex风格：带品牌黄调背景的气泡，右对齐
 * 支持展示文件附件标签
 * Hover 时显示分叉按钮，支持从此消息分叉会话
 */
export function UserMessage({ message, onFork }: { message: KiloMessage; onFork?: (messageId: string) => void }) {
  const { content, attachments } = message

  /** 判断附件是否为图片 */
  const isImage = (mime: string) => mime.startsWith('image/')

  /** 格式化文件大小 */
  const formatSize = (bytes: number): string => {
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${bytes}B`
  }

  return (
    <div className="group relative flex justify-end">
      {/* Hover 分叉按钮 */}
      {onFork && (
        <button
          onClick={() => onFork(message.id)}
          className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-tertiary)] opacity-0 transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] group-hover:opacity-100"
          aria-label="从此消息分叉"
          title="从此消息分叉会话"
        >
          <GitBranch size={14} />
        </button>
      )}
      <div className="max-w-[82%] rounded-[16px] rounded-br-[6px] border border-[var(--border-subtle)] bg-[var(--user-msg-bg)] px-4 py-2.5 text-[13px] text-[var(--text-primary)]">
        {/* 附件标签 */}
        {attachments && attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att, idx) => (
              <div
                key={`${att.name}-${idx}`}
                className="flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px]"
              >
                {isImage(att.mimeType) ? (
                  <Image size={10} className="text-[var(--text-secondary)]" />
                ) : (
                  <FileText size={10} className="text-[var(--accent)]" />
                )}
                <span className="max-w-[100px] truncate text-[var(--text-secondary)]">{att.name}</span>
                <span className="text-[var(--text-tertiary)]">{formatSize(att.size)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap leading-[1.7]">{content}</p>
      </div>
    </div>
  )
}
