import { useState, useMemo } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useConfigStore } from '@/stores/configStore'
import { ChevronDown, Sparkles, Zap, Brain, Cpu, Search } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * 模型选择器
 *
 * 支持 500+ 模型选择 + Auto Model 智能路由
 * 按提供商分组展示，支持搜索过滤
 * Codex风格：紧凑下拉，品牌黄高亮当前模型
 */
export function ModelSelector() {
  const { currentModel, changeModel } = useSessionStore()
  const { models, providers } = useConfigStore()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Auto Model 策略选项
  const autoStrategies = [
    { id: 'auto-efficient', label: 'Auto (高效)', icon: Zap, description: '优先选择快速模型' },
    { id: 'auto-frontier', label: 'Auto (前沿)', icon: Brain, description: '优先选择最强模型' },
    { id: 'auto-balanced', label: 'Auto (均衡)', icon: Sparkles, description: '平衡速度与质量' },
  ]

  // 按提供商分组
  const groupedModels = useMemo(() => {
    const query = searchQuery.toLowerCase()
    const filtered = query
      ? models.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.id.toLowerCase().includes(query) ||
            m.provider.toLowerCase().includes(query)
        )
      : models

    const groups: Record<string, typeof models> = {}
    for (const model of filtered) {
      const provider = model.provider
      if (!groups[provider]) groups[provider] = []
      groups[provider].push(model)
    }
    return groups
  }, [models, searchQuery])

  // 提供商显示名称映射
  const providerNames = useMemo(() => {
    const names: Record<string, string> = {}
    for (const p of providers) {
      names[p.id] = p.name
    }
    return names
  }, [providers])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs transition-colors hover:border-[var(--brand-primary)]"
      >
        <div className="flex items-center gap-1.5">
          <Cpu size={10} className="text-[var(--brand-primary)]" />
          <span className="truncate text-[var(--text-secondary)]">{currentModel || '选择模型'}</span>
        </div>
        <ChevronDown size={10} className="text-[var(--text-tertiary)]" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg">
          {/* 搜索框 */}
          <div className="border-b border-[var(--border-subtle)] p-1.5">
            <div className="relative">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`搜索 ${models.length} 个模型...`}
                className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] py-1 pl-6 pr-2 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Auto Model 策略 */}
          <div className="border-b border-[var(--border-subtle)] p-1">
            <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">智能路由</p>
            {autoStrategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => {
                  changeModel(strategy.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]',
                  currentModel === strategy.id && 'text-[var(--brand-primary)]'
                )}
              >
                <strategy.icon size={12} />
                <div className="text-left">
                  <p>{strategy.label}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{strategy.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* 按提供商分组的模型列表 */}
          <div className="max-h-56 overflow-y-auto p-1">
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider}>
                <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">
                  {providerNames[provider] || provider}
                  <span className="ml-1 opacity-50">({providerModels.length})</span>
                </p>
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      changeModel(model.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-hover)]',
                      currentModel === model.id && 'text-[var(--brand-primary)]'
                    )}
                  >
                    <span className="truncate">{model.name}</span>
                    <div className="flex items-center gap-1">
                      {model.supportsImages && (
                        <span className="text-[8px] text-[var(--accent)]" title="支持图片">🖼</span>
                      )}
                      {model.contextLength && model.contextLength >= 100000 && (
                        <span className="text-[8px] text-[var(--success)]" title="长上下文">∞</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(groupedModels).length === 0 && (
              <p className="px-2 py-2 text-[10px] text-[var(--text-tertiary)]">无匹配模型</p>
            )}
          </div>

          {/* 底部统计 */}
          <div className="border-t border-[var(--border-subtle)] px-2 py-1 text-[9px] text-[var(--text-tertiary)]">
            共 {models.length} 个模型 · {providers.length} 个提供商
          </div>
        </div>
      )}
    </div>
  )
}
