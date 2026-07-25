import { FileText, Image } from 'lucide-react'
import type { KiloMessage, FileAttachment } from '@/types/kilo'

/**
 * 用户消息组件
 *
 * Codex风格：带品牌黄调背景的气泡，右对齐
 * 支持展示文件附件标签
 */
export function UserMessage({ message }: { message: KiloMessage }) {
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
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--user-msg-bg)] px-4 py-2.5">
        {/* 附件标签 */}
        {attachments && attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att, idx) => (
              <div
                key={`${att.name}-${idx}`}
                className="flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px]"
              >
                {isImage(att.mimeType) ? (
                  <Image size={10} className="text-[var(--brand-primary)]" />
                ) : (
                  <FileText size={10} className="text-[var(--accent)]" />
                )}
                <span className="max-w-[100px] truncate text-[var(--text-secondary)]">{att.name}</span>
                <span className="text-[var(--text-tertiary)]">{formatSize(att.size)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{content}</p>
      </div>
    </div>
  )
}
