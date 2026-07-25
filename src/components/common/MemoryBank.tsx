import { useState, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { useMemoryStore } from '@/stores/memoryStore'
import type { MemoryEntry } from '@/types/kilo'
import { Brain, Plus, Trash2, Search, Tag, Loader2 } from 'lucide-react'

/**
 * 记忆库组件
 *
 * 查看、搜索、管理 KiloCode 的项目记忆
 * AI 自动记录工作上下文和用户偏好
 * 与 memoryStore 真实对接
 */
export function MemoryBank() {
  const { entries, loaded, isLoading, addEntry, removeEntry, loadEntries, searchEntries } = useMemoryStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newCategory, setNewCategory] = useState<MemoryEntry['category']>('context')

  // 首次加载
  useEffect(() => {
    if (!loaded) loadEntries()
  }, [loaded, loadEntries])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEntries(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchEntries])

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'preference', label: '偏好' },
    { id: 'context', label: '上下文' },
    { id: 'decision', label: '决策' },
    { id: 'fact', label: '事实' },
  ]

  const filteredEntries = entries.filter((entry) => {
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory
    return matchesCategory
  })

  /** 添加记忆条目 */
  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return
    await addEntry({
      key: newKey.trim(),
      value: newValue.trim(),
      category: newCategory,
    })
    setNewKey('')
    setNewValue('')
    setShowAddForm(false)
  }

  return (
    <div className="flex h-full flex-col">
      {/* 头部 */}
      <div className="border-b border-[var(--border-subtle)] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Brain size={14} className="text-[var(--brand-primary)]" />
            <h3 className="text-xs font-semibold">记忆库</h3>
            {isLoading && <Loader2 size={10} className="animate-spin text-[var(--text-tertiary)]" />}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <Plus size={10} />
            添加
          </button>
        </div>

        {/* 搜索 */}
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索记忆..."
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] py-1 pl-6 pr-2 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
        </div>

        {/* 分类过滤 */}
        <div className="mt-2 flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                'rounded-sm px-1.5 py-0.5 text-[9px] transition-colors',
                filterCategory === cat.id
                  ? 'bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="border-b border-[var(--border-subtle)] p-3">
          <div className="space-y-1.5">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="键名（如 preferred_framework）"
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
            />
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="值（如 React + TypeScript）"
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
              rows={2}
            />
            <div className="flex items-center gap-1">
              {(['preference', 'context', 'decision', 'fact'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 text-[9px] transition-colors',
                    newCategory === cat
                      ? 'bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  {categories.find((c) => c.id === cat)?.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-1">
              <button
                onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue('') }}
                className="rounded-md px-2 py-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!newKey.trim() || !newValue.trim()}
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] transition-colors',
                  newKey.trim() && newValue.trim()
                    ? 'bg-[var(--brand-primary)] text-black hover:bg-[var(--brand-hover)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
                )}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 记忆列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredEntries.length > 0 ? (
          <div className="space-y-1">
            {filteredEntries.map((entry) => (
              <MemoryEntryCard
                key={entry.id}
                entry={entry}
                onDelete={() => removeEntry(entry.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
            <Brain size={24} className="mb-2 opacity-30" />
            <p className="text-[10px]">暂无记忆条目</p>
            <p className="text-[9px]">AI 工作时会自动记录上下文</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** 单条记忆卡片 */
function MemoryEntryCard({ entry, onDelete }: { entry: MemoryEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const categoryColors: Record<string, string> = {
    preference: 'text-[var(--accent)]',
    context: 'text-[var(--brand-primary)]',
    decision: 'text-[var(--warning)]',
    fact: 'text-[var(--success)]',
  }

  const categoryLabels: Record<string, string> = {
    preference: '偏好',
    context: '上下文',
    decision: '决策',
    fact: '事实',
  }

  return (
    <div className="group rounded-md border border-[var(--border-subtle)] p-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <Tag size={8} className={categoryColors[entry.category] || 'text-[var(--text-tertiary)]'} />
        <span className="flex-1 truncate text-[10px] font-medium text-[var(--text-secondary)]">
          {entry.key}
        </span>
        <span className={cn(
          'rounded-sm px-1 py-0.5 text-[8px]',
          categoryColors[entry.category] || 'text-[var(--text-tertiary)]',
          'bg-[var(--bg-tertiary)]'
        )}>
          {categoryLabels[entry.category] || entry.category}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="hidden rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)] group-hover:block"
          title="删除"
        >
          <Trash2 size={8} />
        </button>
      </button>
      {expanded && (
        <div className="mt-1">
          <p className="text-[10px] text-[var(--text-tertiary)]">{entry.value}</p>
          <p className="mt-1 text-[8px] text-[var(--text-tertiary)] opacity-50">
            更新于 {new Date(entry.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
