import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { MessageSquare, Trash2, GitBranch } from 'lucide-react'
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

export function SessionList({ searchQuery = '' }: { searchQuery?: string }) {
  const { sessions, activeSessionId, switchToSession, deleteSession, forkSession } = useSessionStore()

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
      <div className="kc-empty-sessions">
        <MessageSquare size={24} className="mb-2 opacity-30" />
        <p className="text-xs">暂无会话</p>
        <p className="text-[10px]">输入消息开始新会话</p>
      </div>
    )
  }

  return (
    <div className="kc-session-list">
      {/* 分组会话列表 */}
      {grouped.map((group) => (
        <div key={group.label}>
          <div className="kc-side-label">{group.label}</div>
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
        <div className="kc-no-matches">
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
        'kc-side-item group',
        isActive && 'is-active',
        isActive
          ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      title={session.title}
    >
      <div className="kc-side-item-title">
        <p>{session.title || '新会话'}</p>
      </div>

      {/* 悬浮操作按钮 */}
      {showActions && (
        <div className="kc-side-item-actions">
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
