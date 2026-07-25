import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { MessageSquare, Trash2, GitBranch } from 'lucide-react'
import type { KiloSession } from '@/types/kilo'
import { useState } from 'react'

/**
 * 会话列表组件
 *
 * 显示所有会话，支持选择、删除、分叉
 * 与 sessionStore 的真实 API 对接
 */
export function SessionList() {
  const { sessions, activeSessionId, switchToSession, deleteSession, forkSession } = useSessionStore()

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
        <MessageSquare size={24} className="mb-2 opacity-30" />
        <p className="text-xs">暂无会话</p>
        <p className="text-[10px]">输入消息开始新会话</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onSelect={() => switchToSession(session.id)}
          onDelete={() => deleteSession(session.id)}
          onFork={() => forkSession(session.id)}
        />
      ))}
    </div>
  )
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onFork,
}: {
  session: KiloSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onFork: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        isActive
          ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      title={session.title}
    >
      <MessageSquare size={12} className="flex-shrink-0 opacity-50" />
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-xs">{session.title || '新会话'}</p>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
          <span className="capitalize">{session.mode}</span>
          {session.messageCount > 0 && <span>{session.messageCount}条消息</span>}
          {session.status === 'error' && <span className="text-[var(--error)]">错误</span>}
        </div>
      </div>

      {/* 悬浮操作按钮 */}
      {showActions && (
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFork()
            }}
            className="rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--brand-primary)]"
            aria-label="分叉会话"
            title="分叉会话"
          >
            <GitBranch size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)]"
            aria-label="删除会话"
            title="删除会话"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  )
}
