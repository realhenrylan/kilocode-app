import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { useConfigStore } from '@/stores/configStore'
import { CustomModesSection } from './CustomModesSection'
import { RulesSection } from './RulesSection'
import { TitleBar } from '@/components/layout/TitleBar'
import {
  X,
  Palette,
  Server,
  Brain,
  Shield,
  Keyboard,
  Plus,
  Trash2,
  Cog,
  ScrollText,
  Search,
  Settings,
  Bot,
  Terminal,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
type NativeProvider = {
  id: string
  name: string
  aliases: string[]
  setup: string
  note: string
  icon: LucideIcon
}

type NativeProviderGroup = {
  id: string
  label: string
  description: string
  providers: NativeProvider[]
}

const nativeProviderGroups: NativeProviderGroup[] = [
  {
    id: 'kilo',
    label: 'Kilo Code',
    description: '内置账户与 Kilo Gateway，无需单独填写 Provider API Key。',
    providers: [
      { id: 'kilo', name: 'Kilo Code', aliases: ['kilo', 'kilo-gateway'], setup: '账户登录', note: '内置 · 自动更新模型目录', icon: Bot },
    ],
  },
  {
    id: 'labs',
    label: 'AI 模型厂商',
    description: '使用 API Key 或已有账户连接模型厂商。',
    providers: [
      { id: 'anthropic', name: 'Anthropic', aliases: ['anthropic'], setup: 'API Key', note: 'Claude 系列', icon: Bot },
      { id: 'openai', name: 'OpenAI', aliases: ['openai'], setup: 'API Key', note: 'GPT 与推理模型', icon: Brain },
      { id: 'chatgpt', name: 'ChatGPT Plus / Pro', aliases: [], setup: '账户授权', note: '使用 ChatGPT 订阅账户', icon: Brain },
      { id: 'google', name: 'Google Gemini', aliases: ['google'], setup: 'API Key', note: 'Google AI Studio', icon: Cog },
      { id: 'mistral', name: 'Mistral AI', aliases: ['mistral'], setup: 'API Key', note: 'Mistral 与 Codestral', icon: Bot },
      { id: 'deepseek', name: 'DeepSeek', aliases: ['deepseek'], setup: 'API Key', note: 'DeepSeek 模型', icon: Brain },
      { id: 'xai', name: 'xAI (Grok)', aliases: ['xai'], setup: 'API Key', note: 'Grok 系列', icon: Brain },
    ],
  },
  {
    id: 'gateways',
    label: 'AI 网关与云平台',
    description: '通过统一网关或云端托管服务路由模型调用。',
    providers: [
      { id: 'openrouter', name: 'OpenRouter', aliases: ['openrouter'], setup: 'API Key', note: '统一多模型网关', icon: Server },
      { id: 'requesty', name: 'Requesty', aliases: ['requesty'], setup: 'API Key', note: '路由与回退', icon: Server },
      { id: 'unbound', name: 'Unbound', aliases: ['unbound'], setup: 'API Key', note: '统一 API 网关', icon: Server },
      { id: 'zenmux', name: 'ZenMux', aliases: ['zenmux'], setup: 'API Key', note: '多模型路由', icon: Server },
      { id: 'vercel-ai-gateway', name: 'Vercel AI Gateway', aliases: ['vercel-ai-gateway'], setup: 'API Key', note: 'Vercel 统一网关', icon: Server },
      { id: 'vertex', name: 'Google Vertex AI', aliases: ['vertex'], setup: '云端凭据', note: 'Google Cloud 托管模型', icon: Cog },
      { id: 'bedrock', name: 'AWS Bedrock', aliases: ['bedrock', 'amazon'], setup: '云端凭据', note: 'AWS 托管基础模型', icon: Server },
      { id: 'alibaba', name: 'Alibaba Cloud', aliases: ['alibaba', 'dashscope'], setup: 'API Key', note: 'DashScope / Qwen', icon: Server },
      { id: 'cloudflare', name: 'Cloudflare', aliases: ['cloudflare'], setup: 'API Key', note: 'Workers AI 与 AI Gateway', icon: Server },
      { id: 'groq', name: 'Groq', aliases: ['groq'], setup: 'API Key', note: '低延迟推理', icon: Brain },
      { id: 'cerebras', name: 'Cerebras', aliases: ['cerebras'], setup: 'API Key', note: '高速推理', icon: Brain },
      { id: 'fireworks', name: 'Fireworks AI', aliases: ['fireworks', 'fireBorks'], setup: 'API Key', note: '托管开源模型', icon: Brain },
    ],
  },
  {
    id: 'local',
    label: '本地与自托管',
    description: '在本机或私有网络运行模型，适合离线与隐私敏感场景。',
    providers: [
      { id: 'ollama', name: 'Ollama', aliases: ['ollama'], setup: '本地端点', note: '默认 http://localhost:11434', icon: Terminal },
      { id: 'lm-studio', name: 'LM Studio', aliases: ['lm-studio', 'lmstudio'], setup: '本地端点', note: '本地模型服务器', icon: Terminal },
      { id: 'atomic-chat', name: 'Atomic Chat', aliases: ['atomic-chat'], setup: '自动发现', note: '本地 TurboQuant 推理', icon: Terminal },
      { id: 'anaconda-desktop', name: 'Anaconda Desktop', aliases: ['anaconda-desktop'], setup: '自动发现', note: '本地文本生成服务', icon: Terminal },
      { id: 'openai-compatible', name: 'OpenAI Compatible', aliases: ['openai-compatible'], setup: '自定义端点', note: '兼容 OpenAI API 的服务', icon: Server },
    ],
  },
  {
    id: 'other',
    label: '其他原生 Provider',
    description: 'Kilo Code 还为这些服务提供原生接入。',
    providers: [
      { id: 'chutes', name: 'Chutes AI', aliases: ['chutes'], setup: 'API Key', note: '托管模型服务', icon: Brain },
      { id: 'inception', name: 'Inception', aliases: ['inception'], setup: 'API Key', note: '模型服务', icon: Brain },
      { id: 'minimax', name: 'MiniMax', aliases: ['minimax'], setup: 'API Key', note: 'MiniMax 模型', icon: Bot },
      { id: 'moonshot', name: 'Moonshot', aliases: ['moonshot'], setup: 'API Key', note: 'Kimi 模型', icon: Bot },
      { id: 'ovhcloud', name: 'OVHcloud', aliases: ['ovhcloud'], setup: 'API Key', note: '云端模型平台', icon: Server },
      { id: 'sap-ai-core', name: 'SAP AI Core', aliases: ['sap-ai-core'], setup: '云端凭据', note: '企业 AI 平台', icon: Server },
      { id: 'venice', name: 'Venice AI', aliases: ['venice'], setup: 'API Key', note: '模型服务', icon: Brain },
      { id: 'v0', name: 'v0', aliases: ['v0'], setup: '账户授权', note: '特殊模式', icon: Cog },
      { id: 'synthetic', name: 'Synthetic', aliases: ['synthetic'], setup: 'API Key', note: '特殊 Provider', icon: Cog },
    ],
  },
]

const nativeProviderDirectory = nativeProviderGroups.flatMap((group) => group.providers)

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useUiStore()
  const [activeSection, setActiveSection] = useState('models')
  const [searchQuery, setSearchQuery] = useState('')

  const sections = [
    { id: 'general', icon: Settings, label: '通用设置', description: '应用与 API 密钥' },
    { id: 'models', icon: Brain, label: '模型配置', description: '默认模型和提供商' },
    { id: 'modes', icon: Bot, label: '智能体模式', description: '自定义工作模式' },
    { id: 'mcp', icon: Terminal, label: 'MCP 服务器', description: '工具与数据连接' },
    { id: 'theme', icon: Palette, label: '外观设置', description: '主题与界面显示' },
    { id: 'shortcuts', icon: Keyboard, label: '快捷键', description: '键盘操作' },
    { id: 'rules', icon: ScrollText, label: '规则系统', description: 'AI 行为规则' },
    { id: 'permissions', icon: Shield, label: '权限与安全', description: '工具调用策略' },
  ]

  const active = sections.find((section) => section.id === activeSection) ?? sections[0]
  const visibleSections = sections.filter((section) =>
    `${section.label} ${section.description}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  useEffect(() => {
    if (!settingsOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen, setSettingsOpen])

  if (!settingsOpen) return null

  return (
    <div className="kc-settings" role="dialog" aria-modal="true" aria-label="KiloCode 设置">
      <TitleBar />
      <div className="kc-settings-frame">
        <aside className="kc-settings-nav" aria-label="设置分类">
          <div className="kc-settings-brand">
            <span>KiloCode</span>
            <small>设置</small>
          </div>
          <nav className="kc-settings-nav-list">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn('kc-settings-nav-item', activeSection === section.id && 'is-active')}
              >
                <section.icon size={18} strokeWidth={1.8} />
                <span>{section.label}</span>
              </button>
            ))}
            {visibleSections.length === 0 && (
              <p className="kc-settings-nav-empty">未找到匹配项</p>
            )}
          </nav>
          <div className="kc-settings-nav-footer">KiloCode Desktop</div>
        </aside>

        <div className="kc-settings-workspace">
          <header className="kc-settings-topbar">
            <label className="kc-settings-search">
              <Search size={15} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索设置…"
                aria-label="搜索设置"
              />
            </label>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="kc-settings-close"
              aria-label="关闭设置"
              title="关闭设置 (Esc)"
            >
              <X size={17} />
            </button>
          </header>

          <main className="kc-settings-main">
            <div className="kc-settings-content">
              <div className="kc-settings-page-heading">
                <div>
                  <p className="kc-settings-kicker">设置 / {active.label}</p>
                  <h2>{active.label}</h2>
                  <p>{active.description}</p>
                </div>
              </div>

              <div className="kc-settings-view">
                {activeSection === 'general' && <GeneralSection />}
                {activeSection === 'theme' && <ThemeSection />}
                {activeSection === 'models' && <ModelsSection />}
                {activeSection === 'modes' && <CustomModesSection />}
                {activeSection === 'rules' && <RulesSection />}
                {activeSection === 'mcp' && <McpSection />}
                {activeSection === 'permissions' && <PermissionsSection />}
                {activeSection === 'shortcuts' && <ShortcutsSection />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/** 通用应用与连接配置 */
function GeneralSection() {
  const [confirmOnExit, setConfirmOnExit] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(true)

  return (
    <div>
      <h3>通用设置</h3>
      <p className="kc-settings-intro">管理桌面应用的默认行为，以及模型提供商的本地凭据。</p>
      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <h4>应用行为</h4>
          <span>Desktop</span>
        </div>
        <div className="kc-settings-panel">
          <label className="kc-settings-row">
            <span>
              <strong>显示语言</strong>
              <small>界面语言将在下次启动时完全生效</small>
            </span>
            <select defaultValue="zh-CN" aria-label="显示语言">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <SettingSwitch
            label="退出前确认"
            description="关闭桌面应用前显示确认提示"
            checked={confirmOnExit}
            onChange={() => setConfirmOnExit((value) => !value)}
          />
          <SettingSwitch
            label="自动检查更新"
            description="在启动时检查 KiloCode 的可用更新"
            checked={autoUpdate}
            onChange={() => setAutoUpdate((value) => !value)}
          />
        </div>
      </section>
      <ApiKeysSection />
    </div>
  )
}

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="kc-settings-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <button
        type="button"
        className={cn('kc-model-switch', checked && 'is-active')}
        role="switch"
        aria-checked={checked}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  )
}

/** API 密钥配置 */
function ApiKeysSection() {
  const { providers } = useConfigStore()
  const configuredProviders = providers.slice(0, 6)

  return (
    <section className="kc-settings-section">
      <div className="kc-settings-section-heading">
        <div>
          <h4>API 密钥</h4>
          <p>凭据仅保存在本机，用于连接已启用的模型提供商。</p>
        </div>
        <span>Local only</span>
      </div>
      <div className="kc-settings-provider-grid">
        {configuredProviders.map((provider) => (
          <div key={provider.id} className="kc-settings-provider-key">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{provider.name}</span>
              <span className={cn('text-[10px]', provider.apiKeySet ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]')}>
                {provider.apiKeySet ? '已配置' : '未配置'}
              </span>
            </div>
            <input
              type="password"
              placeholder={`输入 ${provider.name} API 密钥`}
              className="kc-settings-input mt-2"
            />
          </div>
        ))}
        {configuredProviders.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)]">正在加载可用提供商…</p>
        )}
      </div>
    </section>
  )
}

/** 主题设置 */
function ThemeSection() {
  const {
    theme,
    setTheme,
    editorFont,
    setEditorFont,
    editorFontSize,
    setEditorFontSize,
    ligaturesEnabled,
    setLigaturesEnabled,
    density,
    setDensity,
  } = useUiStore()
  const [draftTheme, setDraftTheme] = useState(theme)
  const [draftFont, setDraftFont] = useState(editorFont)
  const [draftFontSize, setDraftFontSize] = useState(editorFontSize)
  const [draftLigatures, setDraftLigatures] = useState(ligaturesEnabled)
  const [draftDensity, setDraftDensity] = useState(density)
  const [saved, setSaved] = useState(false)

  const isDirty = draftTheme !== theme
    || draftFont !== editorFont
    || draftFontSize !== editorFontSize
    || draftLigatures !== ligaturesEnabled
    || draftDensity !== density

  const handleSave = () => {
    setTheme(draftTheme)
    setEditorFont(draftFont)
    setEditorFontSize(draftFontSize)
    setLigaturesEnabled(draftLigatures)
    setDensity(draftDensity)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  const handleRestore = () => {
    setDraftTheme('dark')
    setDraftFont('JetBrains Mono')
    setDraftFontSize(12)
    setDraftLigatures(true)
    setDraftDensity('comfortable')
    setSaved(false)
  }

  return (
    <div className="kc-settings-appearance">
      <h3>外观设置</h3>
      <p className="kc-settings-intro">自定义视觉主题、字体排版和界面密度，打造最适合您的编码环境。</p>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <h4>主题模式</h4>
        </div>
        <div className="kc-appearance-theme-grid" role="radiogroup" aria-label="主题模式">
          <AppearanceThemeCard
            value="light"
            label="浅色模式"
            selected={draftTheme === 'light'}
            onSelect={() => setDraftTheme('light')}
          />
          <AppearanceThemeCard
            value="dark"
            label="深色模式"
            selected={draftTheme === 'dark'}
            onSelect={() => setDraftTheme('dark')}
          />
          <AppearanceThemeCard
            value="system"
            label="跟随系统"
            selected={draftTheme === 'system'}
            onSelect={() => setDraftTheme('system')}
          />
        </div>
      </section>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <h4>字体与排版</h4>
        </div>
        <div className="kc-appearance-form-card">
          <label className="kc-appearance-form-row">
            <span>
              <strong>编辑器字体</strong>
              <small>用于代码块和终端的主要字体。</small>
            </span>
            <span className="kc-appearance-select-wrap">
              <select value={draftFont} onChange={(event) => setDraftFont(event.target.value)} aria-label="编辑器字体">
                <option>JetBrains Mono</option>
                <option>Fira Code</option>
                <option>Cascadia Code</option>
                <option>Consolas</option>
                <option>Monaco</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </span>
          </label>

          <div className="kc-appearance-form-row kc-appearance-range-row">
            <span>
              <strong>基础字体大小</strong>
              <small>调整编辑器文本的全局缩放。</small>
            </span>
            <div className="kc-appearance-range-control">
              <span>10px</span>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={draftFontSize}
                onChange={(event) => setDraftFontSize(Number(event.target.value))}
                aria-label="基础字体大小"
              />
              <span>24px</span>
              <output>{draftFontSize}px</output>
            </div>
          </div>

          <label className="kc-appearance-ligatures-row">
            <span>
              <strong>连字显示（Ligatures）</strong>
              <small>启用编辑器专用连字。</small>
            </span>
            <span className="kc-appearance-ligatures-control">
              <button
                type="button"
                className={cn('kc-appearance-switch', draftLigatures && 'is-active')}
                role="switch"
                aria-checked={draftLigatures}
                onClick={() => setDraftLigatures((value) => !value)}
              >
                <span />
              </button>
              <em>{draftLigatures ? '启用编辑专用连字' : '关闭编辑专用连字'}</em>
            </span>
          </label>
        </div>
      </section>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <h4>界面显示密度</h4>
        </div>
        <div className="kc-appearance-density-grid" role="radiogroup" aria-label="界面显示密度">
          <AppearanceDensityCard
            value="comfortable"
            label="舒适模式"
            description="更多留白，阅读体验更佳。"
            selected={draftDensity === 'comfortable'}
            onSelect={() => setDraftDensity('comfortable')}
          />
          <AppearanceDensityCard
            value="compact"
            label="紧凑模式"
            description="最大化信息密度。"
            selected={draftDensity === 'compact'}
            onSelect={() => setDraftDensity('compact')}
          />
        </div>
      </section>

      <div className="kc-appearance-actions">
        <button type="button" className="kc-settings-button is-ghost" onClick={handleRestore}>
          恢复默认设置
        </button>
        <button type="button" className="kc-settings-button is-primary" onClick={handleSave} disabled={!isDirty && !saved}>
          {saved ? '已保存' : '保存更改'}
        </button>
      </div>
    </div>
  )
}

function AppearanceThemeCard({
  value,
  label,
  selected,
  onSelect,
}: {
  value: 'light' | 'dark' | 'system'
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn('kc-appearance-theme-card', `is-${value}`, selected && 'is-selected')}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
    >
      <span className="kc-appearance-theme-preview" aria-hidden="true">
        <span className="kc-preview-toolbar"><i /><i /><i /></span>
        <span className="kc-preview-columns">
          <span className="kc-preview-sidebar" />
          <span className="kc-preview-content"><i /><i /><i /></span>
        </span>
      </span>
      <span className="kc-appearance-card-footer">
        <strong>{label}</strong>
        <span className="kc-appearance-radio" />
      </span>
    </button>
  )
}

function AppearanceDensityCard({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: 'comfortable' | 'compact'
  label: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn('kc-appearance-density-card', selected && 'is-selected')}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
    >
      <span className={cn('kc-appearance-density-preview', `is-${value}`)} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="kc-appearance-card-footer">
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        <span className="kc-appearance-radio" />
      </span>
    </button>
  )
}

/** 模型配置 */
function ModelsSection() {
  const { providers, config, saveConfig, updateProvider } = useConfigStore()
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022')
  const [selectedProviderId, setSelectedProviderId] = useState('kilo')
  const [providerSearch, setProviderSearch] = useState('')
  const [sessionConfigured, setSessionConfigured] = useState<string[]>([])
  const defaultModel = config?.model || selectedModel
  const selectableModels = providers
    .filter((provider) => provider.enabled)
    .flatMap((provider) => provider.models.slice(0, 6).map((model) => ({
      id: model.id,
      label: `${provider.name} · ${model.name}`,
    })))
  const selectedProviderDefinition = nativeProviderDirectory.find((provider) => provider.id === selectedProviderId)
    ?? nativeProviderDirectory[0]
  const selectedProvider = providers.find((provider) =>
    selectedProviderDefinition.aliases.some((alias) => alias === provider.id)
  )
  const isBuiltInProvider = selectedProviderDefinition.id === 'kilo'
  const isSessionConfigured = sessionConfigured.includes(selectedProviderDefinition.id)
  const isSelectedConnected = isBuiltInProvider || selectedProvider?.enabled || isSessionConfigured

  const selectDefaultModel = (modelId: string) => {
    setSelectedModel(modelId)
    void saveConfig({ model: modelId })
  }

  const openProvider = (providerId: string) => {
    setSelectedProviderId(providerId)
  }

  const toggleProvider = (providerId: string) => {
    const definition = nativeProviderDirectory.find((provider) => provider.id === providerId)
    if (!definition || definition.id === 'kilo') {
      setSelectedProviderId('kilo')
      return
    }

    const configuredProvider = providers.find((provider) =>
      definition.aliases.some((alias) => alias === provider.id)
    )

    if (configuredProvider) {
      updateProvider(configuredProvider.id, { enabled: !configuredProvider.enabled })
    }
    setSelectedProviderId(providerId)
  }

  const saveSelectedProvider = () => {
    if (selectedProvider) {
      updateProvider(selectedProvider.id, { enabled: true, apiKeySet: selectedProviderDefinition.setup !== '本地端点' })
    }
    setSessionConfigured((configured) => configured.includes(selectedProviderDefinition.id)
      ? configured
      : [...configured, selectedProviderDefinition.id])
  }

  const matchingGroups = nativeProviderGroups.map((group) => ({
    ...group,
    providers: group.providers.filter((provider) => {
      const searchText = `${provider.name} ${provider.note} ${provider.setup}`.toLowerCase()
      return searchText.includes(providerSearch.trim().toLowerCase())
    }),
  })).filter((group) => group.providers.length > 0)

  const connectedProviderCount = nativeProviderDirectory.filter((definition) => {
    if (definition.id === 'kilo') return true
    return providers.some((provider) => definition.aliases.some((alias) => alias === provider.id) && provider.enabled)
      || sessionConfigured.includes(definition.id)
  }).length

  return (
    <div>
      <h3>模型配置</h3>
      <p className="kc-settings-intro">以 Provider 为单位管理账户、API 密钥和本地端点；模型会随已连接的 Provider 自动出现。</p>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <div>
            <h4>默认模型</h4>
            <p>新任务会优先使用该模型；只显示来自已连接 Provider 的模型。</p>
          </div>
          <span>Default</span>
        </div>
        <div className="kc-settings-default-model">
          <div>
            <strong>用于代码生成与对话</strong>
            <small>已连接的提供商会立即出现在模型选择器中</small>
          </div>
          <label className="kc-settings-select-wrap">
            <select value={defaultModel} onChange={(event) => selectDefaultModel(event.target.value)} aria-label="默认模型">
              {!selectableModels.some((model) => model.id === defaultModel) && (
                <option value={defaultModel}>{defaultModel}</option>
              )}
              {selectableModels.map((model) => (
                <option key={model.id} value={model.id}>{model.label}</option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        </div>
      </section>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <div>
            <h4>Provider 目录</h4>
            <p>基于 Kilo Code 原生 Provider 分类。选择一个 Provider 即可在下方完成配置。</p>
          </div>
          <span>{connectedProviderCount} connected</span>
        </div>
        <label className="kc-settings-provider-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={providerSearch}
            onChange={(event) => setProviderSearch(event.target.value)}
            placeholder="搜索 Provider，例如 Ollama、OpenRouter、Bedrock"
            aria-label="搜索 Provider"
          />
        </label>

        <div className="kc-settings-provider-groups">
          {matchingGroups.map((group) => (
            <section key={group.id} className="kc-settings-provider-group" aria-label={group.label}>
              <div className="kc-settings-provider-group-heading">
                <div>
                  <h5>{group.label}</h5>
                  <p>{group.description}</p>
                </div>
                <span>{group.providers.length}</span>
              </div>
              <div className="kc-settings-provider-directory">
                {group.providers.map((provider) => {
                  const runtimeProvider = providers.find((item) => provider.aliases.some((alias) => alias === item.id))
                  const isBuiltIn = provider.id === 'kilo'
                  const isConnected = isBuiltIn || runtimeProvider?.enabled || sessionConfigured.includes(provider.id)
                  const Icon = provider.icon

                  return (
                    <article
                      key={provider.id}
                      className={cn(
                        'kc-settings-provider-card',
                        selectedProviderDefinition.id === provider.id && 'is-selected',
                        isConnected && 'is-connected',
                      )}
                    >
                      <button type="button" className="kc-settings-provider-card-main" onClick={() => openProvider(provider.id)}>
                        <span className="kc-settings-provider-icon"><Icon size={17} aria-hidden="true" /></span>
                        <span className="kc-settings-provider-copy">
                          <strong>{provider.name}</strong>
                          <small>{provider.note}</small>
                        </span>
                        <span className={cn('kc-settings-provider-state', isConnected && 'is-connected')}>
                          {isBuiltIn ? '内置' : isConnected ? '已连接' : '待配置'}
                        </span>
                      </button>
                      <div className="kc-settings-provider-card-footer">
                        <span>{provider.setup}</span>
                        <button
                          type="button"
                          onClick={() => toggleProvider(provider.id)}
                          className="kc-settings-provider-action"
                        >
                          {runtimeProvider ? (runtimeProvider.enabled ? '停用' : '启用') : '配置'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {matchingGroups.length === 0 && (
          <div className="kc-settings-empty-state">没有找到匹配的原生 Provider。</div>
        )}
      </section>

      <section className="kc-settings-section kc-settings-provider-config-section">
        <div className="kc-settings-section-heading">
          <div>
            <h4>配置：{selectedProviderDefinition.name}</h4>
            <p>{selectedProviderDefinition.note} · {selectedProviderDefinition.setup}</p>
          </div>
          <span>{isBuiltInProvider ? 'Built-in' : isSelectedConnected ? 'Connected' : 'Setup'}</span>
        </div>

        <article className="kc-settings-provider-config">
          <div className="kc-settings-provider-config-summary">
            <span className="kc-settings-provider-icon"><selectedProviderDefinition.icon size={20} aria-hidden="true" /></span>
            <div>
              <strong>{selectedProviderDefinition.name}</strong>
              <p>
                {isBuiltInProvider
                  ? 'Kilo Code 内置 Provider 会通过已登录账户工作，模型目录由 Kilo 自动维护。'
                  : '配置完成后，该 Provider 的模型会自动加入默认模型选择器。'}
              </p>
            </div>
            <span className={cn('kc-settings-provider-state', isSelectedConnected && 'is-connected')}>
              {isBuiltInProvider ? '无需密钥' : isSelectedConnected ? '已连接' : '尚未配置'}
            </span>
          </div>

          {!isBuiltInProvider && (
            <div className="kc-settings-provider-config-fields">
              {['本地端点', '自定义端点'].includes(selectedProviderDefinition.setup) && (
                <label>
                  <span>服务地址 <em>(Base URL)</em></span>
                  <input
                    className="kc-settings-input"
                    defaultValue={selectedProviderDefinition.id === 'ollama' ? 'http://localhost:11434' : ''}
                    placeholder={selectedProviderDefinition.id === 'openai-compatible' ? 'https://your-endpoint/v1' : '输入服务地址'}
                    aria-label={`${selectedProviderDefinition.name} 服务地址`}
                  />
                </label>
              )}
              {!['本地端点', '自动发现'].includes(selectedProviderDefinition.setup) && (
                <label>
                  <span>{selectedProviderDefinition.setup === '云端凭据' ? '云端凭据' : 'API 密钥'} <em>({selectedProviderDefinition.setup})</em></span>
                  <input
                    type="password"
                    className="kc-settings-input"
                    placeholder={`输入 ${selectedProviderDefinition.name} ${selectedProviderDefinition.setup}`}
                    aria-label={`${selectedProviderDefinition.name} ${selectedProviderDefinition.setup}`}
                  />
                </label>
              )}
              {selectedProviderDefinition.setup === '自动发现' && (
                <p className="kc-settings-provider-hint">Kilo Code 会在本地发现运行中的服务；如未发现，请先启动对应应用。</p>
              )}
              <label>
                <span>启用此 Provider</span>
                <button
                  type="button"
                  className={cn('kc-model-switch', isSelectedConnected && 'is-active')}
                  role="switch"
                  aria-checked={Boolean(isSelectedConnected)}
                  onClick={() => toggleProvider(selectedProviderDefinition.id)}
                >
                  <span />
                </button>
              </label>
            </div>
          )}

          <footer className="kc-settings-provider-config-footer">
            <div>
              <span>可用模型</span>
              <strong>{selectedProvider?.models.length ?? (isBuiltInProvider ? '自动同步' : '连接后同步')}</strong>
            </div>
            {!isBuiltInProvider && (
              <button type="button" className="kc-settings-button is-primary" onClick={saveSelectedProvider}>
                保存 Provider 配置
              </button>
            )}
          </footer>
        </article>
      </section>
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
      <h3>MCP 服务器</h3>
      <p className="kc-settings-intro">管理模型上下文协议服务器，为智能体提供额外的工具与数据源。</p>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <div>
            <h4>已配置服务器</h4>
            <p>启用后，服务器提供的工具可供当前智能体模式调用。</p>
          </div>
          <span>{mcpServers.length} configured</span>
        </div>
        {mcpServers.length > 0 ? (
          <div className="kc-settings-stack">
            {mcpServers.map((server) => (
              <article key={server.id} className={cn('kc-settings-list-card', !server.enabled && 'is-muted')}>
                <div className="kc-settings-list-card-main">
                  <div className="kc-settings-list-icon"><Server size={16} /></div>
                  <div>
                    <div className="kc-settings-list-title">
                      <strong>{server.name}</strong>
                      <span className={cn('kc-settings-status', `is-${server.status}`)}>
                        {server.status === 'connected' ? '已连接' : server.status === 'error' ? '错误' : '未连接'}
                      </span>
                    </div>
                    <code>{server.command}{server.args?.length ? ` ${server.args.join(' ')}` : ''}</code>
                  </div>
                </div>
                <div className="kc-settings-list-actions">
                  <button type="button" className={cn('kc-model-switch', server.enabled && 'is-active')} role="switch" aria-checked={server.enabled} aria-label={`${server.name} ${server.enabled ? '已启用' : '已禁用'}`} onClick={() => toggleMcpServer(server.id)}><span /></button>
                  <button type="button" onClick={() => removeMcpServer(server.id)} className="kc-settings-icon-button is-danger" aria-label={`删除 ${server.name}`} title="删除服务器"><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="kc-settings-empty-state">尚未添加 MCP 服务器。</div>
        )}
      </section>

      {showAddForm ? (
        <section className="kc-settings-section kc-settings-form-card">
          <div className="kc-settings-section-heading">
            <div><h4>添加 MCP 服务器</h4><p>填写可执行命令与启动参数。</p></div>
            <span>New connection</span>
          </div>
          <div className="kc-settings-form-grid">
            <label><span>名称</span><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：filesystem" className="kc-settings-input" /></label>
            <label><span>命令</span><input type="text" value={formCommand} onChange={(e) => setFormCommand(e.target.value)} placeholder="例如：npx @modelcontextprotocol/server-filesystem" className="kc-settings-input" /></label>
            <label className="is-full-width"><span>参数 <em>（使用空格分隔）</em></span><input type="text" value={formArgs} onChange={(e) => setFormArgs(e.target.value)} placeholder="例如：/path/to/dir" className="kc-settings-input" /></label>
          </div>
          <div className="kc-settings-form-actions">
            <button type="button" className="kc-settings-button is-ghost" onClick={() => { setShowAddForm(false); setFormName(''); setFormCommand(''); setFormArgs('') }}>取消</button>
            <button type="button" className="kc-settings-button is-primary" onClick={handleAdd} disabled={!formName.trim() || !formCommand.trim()}>添加服务器</button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setShowAddForm(true)} className="kc-settings-secondary-action"><Plus size={15} aria-hidden="true" /> 添加 MCP 服务器</button>
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

  const [toolPolicies, setToolPolicies] = useState<Record<string, 'always-ask' | 'auto-approve' | 'deny'>>(
    Object.fromEntries(toolPermissions.map((tool) => [tool.id, tool.policy]))
  )

  return (
    <div>
      <h3>权限与安全</h3>
      <p className="kc-settings-intro">配置智能体调用工具时的默认策略。更宽松的策略会提高效率，但也会扩大自动操作范围。</p>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <div><h4>默认策略</h4><p>未单独设置的工具将遵循此权限级别。</p></div>
          <span>Safety first</span>
        </div>
        <div className="kc-settings-policy-grid">
          {([
            { value: 'always-ask' as const, label: '总是询问', desc: '每次工具调用前确认', tone: 'warning' },
            { value: 'auto-approve' as const, label: '自动批准', desc: '自动允许低风险工具调用', tone: 'success' },
            { value: 'deny' as const, label: '默认拒绝', desc: '除非单独允许，否则拒绝调用', tone: 'danger' },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDefaultPolicy(option.value)}
              className={cn(
                'kc-settings-policy-card',
                `is-${option.tone}`,
                defaultPolicy === option.value && 'is-active'
              )}
            >
              <strong>{option.label}</strong>
              <span>{option.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <div><h4>工具权限</h4><p>对关键工具覆盖默认策略。</p></div>
          <span>{toolPermissions.length} tools</span>
        </div>
        <div className="kc-settings-permission-list">
        {toolPermissions.map((tool) => (
          <label key={tool.id} className="kc-settings-permission-row">
            <div>
              <strong>{tool.name}</strong>
              <span>{tool.description}</span>
            </div>
            <select
              value={toolPolicies[tool.id]}
              onChange={(event) => setToolPolicies((policies) => ({ ...policies, [tool.id]: event.target.value as typeof tool.policy }))}
              aria-label={`${tool.name} 权限策略`}
            >
              <option value="always-ask">总是询问</option>
              <option value="auto-approve">自动批准</option>
              <option value="deny">拒绝</option>
            </select>
          </label>
        ))}
        </div>
      </section>
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
      <h3>快捷键</h3>
      <p className="kc-settings-intro">使用键盘快速切换工作区、创建任务并控制智能体生成。</p>
      <section className="kc-settings-section">
        <div className="kc-settings-section-heading">
          <div><h4>默认快捷键</h4><p>以下为当前可用的默认组合键。</p></div>
          <span>{shortcuts.length} commands</span>
        </div>
        <div className="kc-settings-shortcut-list">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.keys} className="kc-settings-shortcut-row">
              <span>{shortcut.action}</span>
              <kbd>{shortcut.keys}</kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
