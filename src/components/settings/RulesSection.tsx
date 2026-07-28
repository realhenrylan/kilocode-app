import { useState } from 'react'
import { cn } from '@/utils/cn'
import { useRulesStore } from '@/stores/rulesStore'
import type { RuleFile, RuleSource } from '@/types/kilo'
import {
  Plus,
  Trash2,
  Pencil,
  Globe,
  FolderTree,
  Building2,
  FileText,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

/**
 * 规则系统管理组件
 *
 * 管理 KiloCode 规则文件：
 * - 全局规则：适用于所有项目
 * - 项目规则：存储在 .kilocode/rules/ 目录
 * - 工作区规则：当前工作区特定规则
 *
 * 规则文件为 Markdown 格式，作为 AI 的行为指导
 */

/** 来源标签配置 */
const SOURCE_CONFIG: Record<RuleSource, { label: string; icon: typeof Globe; color: string; description: string }> = {
  global: {
    label: '全局',
    icon: Globe,
    color: 'text-[var(--accent)]',
    description: '适用于所有项目',
  },
  project: {
    label: '项目',
    icon: FolderTree,
    color: 'text-[var(--success)]',
    description: '存储在 .kilocode/rules/ 目录',
  },
  workspace: {
    label: '工作区',
    icon: Building2,
    color: 'text-[var(--warning)]',
    description: '当前工作区特定规则',
  },
}

export function RulesSection() {
  const { rules, addRule, removeRule, toggleRule, updateRule } = useRulesStore()
  const [filterSource, setFilterSource] = useState<RuleSource | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // 过滤规则
  const filteredRules = filterSource === 'all'
    ? rules
    : rules.filter((r) => r.source === filterSource)

  // 统计
  const enabledCount = rules.filter((r) => r.enabled).length

  return (
    <div className="kc-settings-complex-section">
      <h3 className="mb-4 text-sm font-semibold">规则系统</h3>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        管理 AI 行为规则文件。规则以 Markdown 格式编写，作为 AI 的行为指导。
        全局规则适用于所有项目，项目规则存储在 <code className="rounded bg-[var(--code-bg)] px-1 text-[var(--accent)]">.kilocode/rules/</code> 目录。
      </p>

      {/* 统计 + 过滤 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {enabledCount}/{rules.length} 已启用
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'global', 'project', 'workspace'] as const).map((source) => {
            const config = source !== 'all' ? SOURCE_CONFIG[source] : null
            return (
              <button
                key={source}
                onClick={() => setFilterSource(source)}
                className={cn(
                  'flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] transition-colors',
                  filterSource === source
                    ? 'bg-[var(--brand-primary)] text-black'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                {config ? <config.icon size={10} /> : <FileText size={10} />}
                {source === 'all' ? '全部' : config?.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 规则列表 */}
      {filteredRules.length > 0 ? (
        <div className="space-y-2">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              isEditing={editingId === rule.id}
              onEdit={() => setEditingId(rule.id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => removeRule(rule.id)}
              onToggle={() => toggleRule(rule.id)}
              onUpdate={(updates) => {
                updateRule(rule.id, updates)
                setEditingId(null)
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-tertiary)]">暂无规则文件</p>
      )}

      {/* 添加按钮 / 表单 */}
      {showAddForm ? (
        <RuleForm
          onSubmit={(rule) => {
            addRule(rule)
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="kc-settings-secondary-action"
        >
          <Plus size={12} />
          添加规则
        </button>
      )}
    </div>
  )
}

/** 单个规则卡片 */
function RuleCard({
  rule,
  isEditing,
  onEdit,
  onCancelEdit,
  onDelete,
  onToggle,
  onUpdate,
}: {
  rule: RuleFile
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onUpdate: (updates: Partial<RuleFile>) => void
}) {
  const sourceConfig = SOURCE_CONFIG[rule.source]
  const SourceIcon = sourceConfig.icon

  if (isEditing) {
    return (
      <RuleForm
        initial={rule}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
      />
    )
  }

  return (
    <div className={cn('kc-settings-list-card kc-settings-rule-card', !rule.enabled && 'is-muted')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 启用/禁用切换 */}
          <button
            onClick={onToggle}
            className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--brand-primary)]"
            title={rule.enabled ? '点击禁用' : '点击启用'}
          >
            {rule.enabled ? (
              <ToggleRight size={16} className="text-[var(--success)]" />
            ) : (
              <ToggleLeft size={16} />
            )}
          </button>
          {/* 来源图标 */}
          <SourceIcon size={12} className={sourceConfig.color} />
          <span className="text-xs font-medium">{rule.name}</span>
          <span className={cn(
            'rounded px-1 py-0.5 text-[9px]',
            sourceConfig.color,
            'bg-[var(--bg-tertiary)]'
          )}>
            {sourceConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            title="编辑规则"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)]"
            title="删除规则"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {/* 描述 */}
      {rule.description && (
        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{rule.description}</p>
      )}
      {/* 路径 */}
      {rule.path && (
        <p className="mt-0.5 text-[9px] font-mono text-[var(--text-tertiary)]">{rule.path}</p>
      )}
      {/* 内容预览 */}
      <p className="mt-1 line-clamp-2 text-[9px] text-[var(--text-tertiary)] italic">
        "{rule.content.slice(0, 120)}{rule.content.length > 120 ? '...' : ''}"
      </p>
    </div>
  )
}

/** 规则编辑/创建表单 */
function RuleForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: RuleFile
  onSubmit: (data: Omit<RuleFile, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const isEdit = !!initial

  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [content, setContent] = useState(initial?.content || '')
  const [source, setSource] = useState<RuleSource>(initial?.source || 'project')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)

  const canSubmit = name.trim().length > 0 && content.trim().length > 0

  return (
    <div className="kc-settings-form-card kc-settings-complex-form">
      <div className="space-y-3">
        {/* 规则名称 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            规则名称 <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：coding-style"
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            描述
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简短描述此规则的用途"
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
        </div>

        {/* 来源选择 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            来源
          </label>
          <div className="flex gap-2">
            {(['global', 'project', 'workspace'] as const).map((s) => {
              const config = SOURCE_CONFIG[s]
              const Icon = config.icon
              return (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
                    source === s
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]'
                  )}
                >
                  <Icon size={12} />
                  {config.label}
                </button>
              )
            })}
          </div>
          <p className="mt-1 text-[9px] text-[var(--text-tertiary)]">
            {SOURCE_CONFIG[source].description}
          </p>
        </div>

        {/* 规则内容（Markdown） */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            规则内容 <span className="text-[var(--error)]">*</span>
            <span className="ml-1 text-[var(--text-tertiary)]">（Markdown 格式）</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'# 规则标题\n\n- 规则条目 1\n- 规则条目 2\n- 规则条目 3'}
            rows={8}
            className="w-full resize-y rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
        </div>

        {/* 启用开关 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEnabled(!enabled)}
            className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--brand-primary)]"
          >
            {enabled ? (
              <ToggleRight size={16} className="text-[var(--success)]" />
            ) : (
              <ToggleLeft size={16} />
            )}
          </button>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {enabled ? '已启用' : '已禁用'}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (!canSubmit) return
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                content: content.trim(),
                source,
                enabled,
                path: source !== 'global' ? `.kilocode/rules/${name.trim()}.md` : undefined,
              })
            }}
            disabled={!canSubmit}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs transition-colors',
              canSubmit
                ? 'bg-[var(--brand-primary)] text-black hover:bg-[var(--brand-hover)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
            )}
          >
            {isEdit ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}
