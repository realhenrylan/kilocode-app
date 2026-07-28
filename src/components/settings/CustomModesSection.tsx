import { useState } from 'react'
import { cn } from '@/utils/cn'
import { useConfigStore } from '@/stores/configStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { CustomMode } from '@/types/kilo'
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  Bot,
  Building2,
  GraduationCap,
  Wrench,
  FileCode,
  TestTube,
  BookOpen,
  Sparkles,
} from 'lucide-react'

/**
 * 自定义模式管理组件
 *
 * 允许用户创建/编辑/删除自定义 Agent 模式
 * 配置模式名称、描述、系统提示词、可用工具列表
 */

/** 可选图标列表 */
const ICON_OPTIONS = [
  { value: 'Bot', label: '机器人', Icon: Bot },
  { value: 'Building2', label: '建筑', Icon: Building2 },
  { value: 'GraduationCap', label: '导师', Icon: GraduationCap },
  { value: 'Wrench', label: '工具', Icon: Wrench },
  { value: 'FileCode', label: '代码', Icon: FileCode },
  { value: 'TestTube', label: '测试', Icon: TestTube },
  { value: 'BookOpen', label: '文档', Icon: BookOpen },
  { value: 'Sparkles', label: '创意', Icon: Sparkles },
]

/** 可用工具列表 */
const AVAILABLE_TOOLS = [
  { id: 'read_file', name: '读取文件', description: '读取工作目录中的文件' },
  { id: 'write_file', name: '写入文件', description: '创建或修改文件' },
  { id: 'execute_command', name: '执行命令', description: '在终端中执行命令' },
  { id: 'list_directory', name: '列出目录', description: '浏览目录结构' },
  { id: 'search', name: '搜索代码库', description: '搜索和索引代码库' },
  { id: 'browser_navigate', name: '浏览器导航', description: '导航到指定 URL' },
  { id: 'browser_click', name: '浏览器点击', description: '点击页面元素' },
  { id: 'browser_type', name: '浏览器输入', description: '在页面元素中输入文本' },
  { id: 'browser_screenshot', name: '浏览器截图', description: '截取页面截图' },
  { id: 'mcp_tool', name: 'MCP 工具', description: '调用 MCP 服务器工具' },
  { id: 'delete_file', name: '删除文件', description: '删除工作目录中的文件' },
]

/** 根据图标名称获取 Lucide 组件 */
function getIconComponent(iconName?: string) {
  const found = ICON_OPTIONS.find((o) => o.value === iconName)
  return found?.Icon || Bot
}

export function CustomModesSection() {
  const { customModes, addCustomMode, updateCustomMode, removeCustomMode } = useConfigStore()
  const { currentMode, changeMode } = useSessionStore()
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="kc-settings-complex-section">
      <h3 className="mb-4 text-sm font-semibold">自定义模式</h3>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        创建自定义 Agent 模式，配置专属系统提示词和可用工具。自定义模式会出现在模式选择器中。
      </p>

      {/* 已有自定义模式列表 */}
      {customModes.length > 0 ? (
        <div className="space-y-2">
          {customModes.map((mode) => (
            <ModeCard
              key={mode.slug}
              mode={mode}
              isActive={currentMode === mode.slug}
              isEditing={editingSlug === mode.slug}
              onActivate={() => changeMode(mode.slug)}
              onEdit={() => setEditingSlug(mode.slug)}
              onCancelEdit={() => setEditingSlug(null)}
              onDelete={() => removeCustomMode(mode.slug)}
              onUpdate={(updates) => {
                updateCustomMode(mode.slug, updates)
                setEditingSlug(null)
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-tertiary)]">暂无自定义模式</p>
      )}

      {/* 添加按钮 / 表单 */}
      {showAddForm ? (
        <ModeForm
          onSubmit={(mode) => {
            addCustomMode(mode)
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
          添加自定义模式
        </button>
      )}
    </div>
  )
}

/** 单个模式卡片 */
function ModeCard({
  mode,
  isActive,
  isEditing,
  onActivate,
  onEdit,
  onCancelEdit,
  onDelete,
  onUpdate,
}: {
  mode: CustomMode
  isActive: boolean
  isEditing: boolean
  onActivate: () => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<CustomMode>) => void
}) {
  const Icon = getIconComponent(mode.icon)

  if (isEditing) {
    return (
      <ModeForm
        initial={mode}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
      />
    )
  }

  return (
    <div className={cn('kc-settings-list-card kc-settings-mode-card', isActive && 'is-active')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-6 w-6 items-center justify-center rounded',
            isActive ? 'bg-[var(--brand-primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
          )}>
            <Icon size={12} />
          </div>
          <div>
            <span className="text-xs font-medium">{mode.name}</span>
            {isActive && (
              <span className="ml-2 text-[10px] text-[var(--brand-primary)]">当前</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onActivate}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--brand-primary)]"
            title="切换到此模式"
          >
            <Check size={12} />
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            title="编辑模式"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)]"
            title="删除模式"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{mode.description}</p>
      {/* 工具标签 */}
      <div className="mt-2 flex flex-wrap gap-1">
        {mode.tools.map((toolId) => {
          const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId)
          return (
            <span
              key={toolId}
              className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-tertiary)]"
              title={tool?.description}
            >
              {tool?.name || toolId}
            </span>
          )
        })}
      </div>
      {/* 系统提示词预览 */}
      {mode.systemPrompt && (
        <p className="mt-2 line-clamp-2 text-[9px] text-[var(--text-tertiary)] italic">
          "{mode.systemPrompt}"
        </p>
      )}
    </div>
  )
}

/** 模式编辑/创建表单 */
function ModeForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: CustomMode
  onSubmit: (data: Omit<CustomMode, 'slug'>) => void
  onCancel: () => void
}) {
  const isEdit = !!initial

  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt || '')
  const [icon, setIcon] = useState(initial?.icon || 'Bot')
  const [selectedTools, setSelectedTools] = useState<string[]>(initial?.tools || [])

  /** 切换工具选中状态 */
  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    )
  }

  /** 全选/取消全选工具 */
  const toggleAllTools = () => {
    if (selectedTools.length === AVAILABLE_TOOLS.length) {
      setSelectedTools([])
    } else {
      setSelectedTools(AVAILABLE_TOOLS.map((t) => t.id))
    }
  }

  const canSubmit = name.trim().length > 0 && systemPrompt.trim().length > 0

  return (
    <div className="kc-settings-form-card kc-settings-complex-form">
      <div className="space-y-3">
        {/* 模式名称 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            模式名称 <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：Architect"
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
            placeholder="简短描述此模式的用途"
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
        </div>

        {/* 图标选择 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            图标
          </label>
          <div className="flex flex-wrap gap-1">
            {ICON_OPTIONS.map(({ value, label, Icon: IconComp }) => (
              <button
                key={value}
                onClick={() => setIcon(value)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  icon === value
                    ? 'bg-[var(--brand-primary)] text-black'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
                title={label}
              >
                <IconComp size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* 系统提示词 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">
            系统提示词 <span className="text-[var(--error)]">*</span>
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="定义此模式下 AI 的行为和角色..."
            rows={4}
            className="w-full resize-y rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
        </div>

        {/* 可用工具 */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[10px] font-medium text-[var(--text-secondary)]">
              可用工具
            </label>
            <button
              onClick={toggleAllTools}
              className="text-[9px] text-[var(--brand-primary)] hover:underline"
            >
              {selectedTools.length === AVAILABLE_TOOLS.length ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {AVAILABLE_TOOLS.map((tool) => {
              const selected = selectedTools.includes(tool.id)
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded border px-2 py-1 text-left transition-colors',
                    selected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                      : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)]'
                  )}
                >
                  <span className={cn(
                    'flex h-3 w-3 items-center justify-center rounded border text-[8px]',
                    selected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-black'
                      : 'border-[var(--border)]'
                  )}>
                    {selected && '✓'}
                  </span>
                  <span className="text-[10px]">{tool.name}</span>
                </button>
              )
            })}
          </div>
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
                description: description.trim(),
                systemPrompt: systemPrompt.trim(),
                tools: selectedTools,
                icon,
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
