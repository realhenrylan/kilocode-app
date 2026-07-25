import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { MessageSquare, Trash2, GitBranch, Search } from 'lucide-react'
import type { KiloSession } from '@/types/kilo'
import { useState, useMemo } from 'react'

/**
 * 会话列表组件（Codex V2.3 风格）
 *
 * 按日期分组：今天 / 昨天 / 过去7天 / 更早
 * 支持搜索过滤
 * 激活态用中性灰，去黄
 */

/** 日期分组逻辑 */
function groupSessionsByDate(sessions: KiloSession[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: { label: string; sessions: KiloSession[] }[] = [
    { label: '今天', sessions: [] },
    { label: '昨天', sessions: [] },
    { label: '过去 7 天', sessions: [] },
    { label: '更早', sessions: [] },
  ]

  for (const session of sessions) {
    const date = new Date(session.createdAt)
    if (date >= today) {
      groups[0].sessions.push(session)
    } else if (date >= yesterday) {
      groups[1].sessions.push(session)
    } else if (date >= weekAgo) {
      groups[2].sessions.push(session)
    } else {
      groups[3].sessions.push(session)
    }
  }

  // 只返回有会话的分组
  return groups.filter(g => g.sessions.length > 0)
}

export function SessionList() {
  const { sessions, activeSessionId, switchToSession, deleteSession, forkSession } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')

  /** 搜索过滤 */
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter(s =>
      (s.title || '').toLowerCase().includes(q) ||
      s.mode.toLowerCase().includes(q)
    )
  }, [sessions, searchQuery])

  /** 日期分组 */
  const grouped = useMemo(() => groupSessionsByDate(filteredSessions), [filteredSessions])

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
    <div className="flex flex-col">
      {/* 搜索框 */}
      <div className="px-1 pb-1">
        <div className="flex items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
          <Search size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索会话"
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
        </div>
      </div>

      {/* 分组会话列表 */}
      {grouped.map((group) => (
        <div key={group.label}>
          <div className="px-2 pt-2.5 pb-1 text-[11px] text-[var(--text-tertiary)]">{group.label}</div>
          {group.sessions.map((session) => (
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
      ))}

      {filteredSessions.length === 0 && searchQuery && (
        <div className="px-2 py-4 text-center text-xs text-[var(--text-tertiary)]">
          无匹配会话
        </div>
      )}
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
        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-left transition-colors',
        isActive
          ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      title={session.title}
    >
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-[12.5px]">{session.title || '新会话'}</p>
      </div>

      {/* 悬浮操作按钮 */}
      {showActions && (
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFork()
            }}
            className="rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
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
