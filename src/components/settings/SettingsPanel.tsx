import { useState } from 'react'
import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { useConfigStore } from '@/stores/configStore'
import { CustomModesSection } from './CustomModesSection'
import { RulesSection } from './RulesSection'
import {
  X,
  Key,
  Palette,
  Monitor,
  Server,
  Brain,
  Shield,
  Keyboard,
  ChevronRight,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Cog,
  ScrollText,
} from 'lucide-react'

/**
 * 设置面板
 *
 * 完整的设置页面，包含：
 * - API 密钥配置
 * - 主题设置
 * - MCP 服务器管理
 * - 模型配置
 * - 权限设置
 * - 快捷键配置
 */
export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useUiStore()
  const [activeSection, setActiveSection] = useState('api')

  const sections = [
    { id: 'api', icon: Key, label: 'API 密钥' },
    { id: 'theme', icon: Palette, label: '外观' },
    { id: 'models', icon: Brain, label: '模型' },
    { id: 'modes', icon: Cog, label: '自定义模式' },
    { id: 'rules', icon: ScrollText, label: '规则' },
    { id: 'mcp', icon: Server, label: 'MCP 服务器' },
    { id: 'permissions', icon: Shield, label: '权限' },
    { id: 'shortcuts', icon: Keyboard, label: '快捷键' },
  ]

  if (!settingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)]">
      <div className="mx-4 flex h-[600px] w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* 左侧导航 */}
        <div className="w-48 border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-sm font-semibold">设置</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            >
              <X size={14} />
            </button>
          </div>
          <nav className="p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
                  activeSection === section.id
                    ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]'
                )}
              >
                <section.icon size={14} />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'api' && <ApiKeysSection />}
          {activeSection === 'theme' && <ThemeSection />}
          {activeSection === 'models' && <ModelsSection />}
          {activeSection === 'modes' && <CustomModesSection />}
          {activeSection === 'rules' && <RulesSection />}
          {activeSection === 'mcp' && <McpSection />}
          {activeSection === 'permissions' && <PermissionsSection />}
          {activeSection === 'shortcuts' && <ShortcutsSection />}
        </div>
      </div>
    </div>
  )
}

/** API 密钥配置 */
function ApiKeysSection() {
  const { providers } = useConfigStore()

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">API 密钥</h3>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        配置各模型提供商的 API 密钥。密钥将安全存储在本地。
      </p>
      <div className="space-y-3">
        {['Anthropic', 'OpenAI', 'Google', 'xAI', 'Mistral', 'Kilo Gateway'].map((provider) => (
          <div key={provider} className="rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{provider}</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">未配置</span>
            </div>
            <input
              type="password"
              placeholder={`输入 ${provider} API 密钥`}
              className="mt-2 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 主题设置 */
function ThemeSection() {
  const { theme, setTheme } = useUiStore()

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">外观</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--text-secondary)]">主题模式</label>
          <div className="flex gap-2">
            {[
              { value: 'dark', label: '深色' },
              { value: 'light', label: '浅色' },
              { value: 'system', label: '跟随系统' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as any)}
                className={cn(
                  'rounded-md border px-4 py-2 text-xs transition-colors',
                  theme === option.value
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 模型配置 */
function ModelsSection() {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">模型配置</h3>
      <p className="text-xs text-[var(--text-tertiary)]">连接 KiloCode CLI 后可配置模型参数。</p>
    </div>
  )
}

/** MCP 服务器管理 */
function McpSection() {
  const { mcpServers, addMcpServer, removeMcpServer, toggleMcpServer } = useConfigStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formArgs, setFormArgs] = useState('')

  /** 提交添加 MCP 服务器 */
  const handleAdd = async () => {
    if (!formName.trim() || !formCommand.trim()) return

    await addMcpServer({
      name: formName.trim(),
      command: formCommand.trim(),
      args: formArgs.trim() ? formArgs.trim().split(/\s+/) : undefined,
      enabled: true,
    })

    // 重置表单
    setFormName('')
    setFormCommand('')
    setFormArgs('')
    setShowAddForm(false)
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">MCP 服务器</h3>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        管理模型上下文协议（MCP）服务器连接。MCP 服务器为 AI 提供额外的工具和数据源。
      </p>

      {/* 服务器列表 */}
      {mcpServers.length > 0 ? (
        <div className="space-y-2">
          {mcpServers.map((server) => (
            <div key={server.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMcpServer(server.id)}
                    className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--brand-primary)]"
                    title={server.enabled ? '点击禁用' : '点击启用'}
                  >
                    {server.enabled ? (
                      <ToggleRight size={16} className="text-[var(--success)]" />
                    ) : (
                      <ToggleLeft size={16} />
                    )}
                  </button>
                  <span className={cn(
                    'text-xs font-medium',
                    !server.enabled && 'text-[var(--text-tertiary)] line-through'
                  )}>
                    {server.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-[10px]',
                    server.status === 'connected' ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'
                  )}>
                    {server.status === 'connected' ? '已连接' : server.status === 'error' ? '错误' : '未连接'}
                  </span>
                  <button
                    onClick={() => removeMcpServer(server.id)}
                    className="rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)]"
                    title="删除服务器"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                <span className="font-mono">{server.command}</span>
                {server.args && server.args.length > 0 && (
                  <span> {server.args.join(' ')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-tertiary)]">暂无 MCP 服务器配置</p>
      )}

      {/* 添加按钮 / 表单 */}
      {showAddForm ? (
        <div className="mt-3 rounded-lg border border-[var(--brand-primary)] bg-[var(--bg-tertiary)] p-3">
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">名称</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：filesystem"
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">命令</label>
              <input
                type="text"
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
                placeholder="例如：npx @modelcontextprotocol/server-filesystem"
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[var(--text-secondary)]">参数（空格分隔）</label>
              <input
                type="text"
                value={formArgs}
                onChange={(e) => setFormArgs(e.target.value)}
                placeholder="例如：/path/to/dir"
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setFormName('')
                  setFormCommand('')
                  setFormArgs('')
                }}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!formName.trim() || !formCommand.trim()}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs transition-colors',
                  formName.trim() && formCommand.trim()
                    ? 'bg-[var(--brand-primary)] text-black hover:bg-[var(--brand-hover)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
                )}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-3 flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-tertiary)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <Plus size={12} />
          添加 MCP 服务器
        </button>
      )}
    </div>
  )
}

/** 权限设置 */
function PermissionsSection() {
  const [defaultPolicy, setDefaultPolicy] = useState<'always-ask' | 'auto-approve' | 'deny'>('always-ask')

  /** 工具权限配置项 */
  const toolPermissions = [
    { id: 'read_file', name: '读取文件', description: '读取工作目录中的文件内容', policy: 'auto-approve' as const },
    { id: 'write_file', name: '写入文件', description: '创建或修改文件', policy: 'always-ask' as const },
    { id: 'execute_command', name: '执行命令', description: '在终端中执行 shell 命令', policy: 'always-ask' as const },
    { id: 'browser_navigate', name: '浏览器导航', description: '导航到指定 URL', policy: 'always-ask' as const },
    { id: 'browser_click', name: '浏览器点击', description: '点击页面元素', policy: 'always-ask' as const },
    { id: 'browser_type', name: '浏览器输入', description: '在页面元素中输入文本', policy: 'always-ask' as const },
    { id: 'browser_screenshot', name: '浏览器截图', description: '截取页面截图', policy: 'auto-approve' as const },
    { id: 'mcp_tool', name: 'MCP 工具调用', description: '调用 MCP 服务器提供的工具', policy: 'always-ask' as const },
    { id: 'search', name: '搜索代码库', description: '搜索和索引代码库', policy: 'auto-approve' as const },
    { id: 'list_directory', name: '列出目录', description: '浏览目录结构', policy: 'auto-approve' as const },
    { id: 'delete_file', name: '删除文件', description: '删除工作目录中的文件', policy: 'deny' as const },
  ]

  const policyLabels: Record<string, { label: string; color: string }> = {
    'always-ask': { label: '总是询问', color: 'text-[var(--warning)]' },
    'auto-approve': { label: '自动批准', color: 'text-[var(--success)]' },
    'deny': { label: '拒绝', color: 'text-[var(--error)]' },
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">权限设置</h3>
      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        配置 AI 调用工具时的默认权限策略。更宽松的策略可以提高效率，但可能带来安全风险。
      </p>

      {/* 默认策略 */}
      <div className="mb-4 rounded-lg border border-[var(--border)] p-3">
        <h4 className="mb-2 text-xs font-medium">默认策略</h4>
        <p className="mb-2 text-[10px] text-[var(--text-tertiary)]">
          未单独配置的工具将使用此默认策略
        </p>
        <div className="flex gap-2">
          {([
            { value: 'always-ask' as const, label: '总是询问', desc: '每次工具调用前确认', color: 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]' },
            { value: 'auto-approve' as const, label: '自动批准', desc: '自动允许工具调用', color: 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]' },
            { value: 'deny' as const, label: '拒绝', desc: '默认拒绝所有调用', color: 'border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]' },
          ]).map((option) => (
            <button
              key={option.value}
              onClick={() => setDefaultPolicy(option.value)}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-left transition-colors',
                defaultPolicy === option.value
                  ? option.color
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]'
              )}
            >
              <p className="text-xs font-medium">{option.label}</p>
              <p className="text-[10px] opacity-70">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 各工具权限配置 */}
      <div className="space-y-1">
        <h4 className="mb-2 text-xs font-medium">工具权限</h4>
        {toolPermissions.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)]">{tool.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{tool.description}</p>
            </div>
            <span className={cn('text-[10px] font-medium', policyLabels[tool.policy]?.color)}>
              {policyLabels[tool.policy]?.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 快捷键配置 */
function ShortcutsSection() {
  const shortcuts = [
    { keys: 'Ctrl+N', action: '新建会话' },
    { keys: 'Ctrl+Shift+N', action: '新建窗口' },
    { keys: 'Ctrl+B', action: '切换侧边栏' },
    { keys: 'Ctrl+J', action: '切换终端' },
    { keys: 'Ctrl+,', action: '打开设置' },
    { keys: 'Ctrl+Enter', action: '发送消息' },
    { keys: 'Escape', action: '中断生成' },
  ]

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">快捷键</h3>
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.keys} className="flex items-center justify-between rounded-md px-3 py-2">
            <span className="text-xs text-[var(--text-secondary)]">{shortcut.action}</span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)]">
              {shortcut.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}
