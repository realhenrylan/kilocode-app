import { cn } from '@/utils/cn'
import type { AgentMode, BuiltinMode, CustomMode } from '@/types/kilo'
import { useSessionStore } from '@/stores/sessionStore'
import { useConfigStore } from '@/stores/configStore'
import {
  Code,
  Lightbulb,
  HelpCircle,
  Bug,
  ShieldCheck,
  Bot,
  Building2,
  GraduationCap,
  Wrench,
  FileCode,
  TestTube,
  BookOpen,
  Sparkles,
  ChevronDown,
  Cog,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

/**
 * Agent 模式选择器
 *
 * 5种内置模式 + 自定义模式
 * Codex风格：紧凑按钮组，当前模式用品牌黄高亮
 * 自定义模式通过下拉菜单展示
 */

/** 内置模式定义 */
const BUILTIN_MODES: { id: BuiltinMode; icon: typeof Code; label: string; description: string }[] = [
  { id: 'code', icon: Code, label: 'Code', description: '编写和编辑代码' },
  { id: 'plan', icon: Lightbulb, label: 'Plan', description: '架构设计和规划' },
  { id: 'ask', icon: HelpCircle, label: 'Ask', description: '问答（不修改文件）' },
  { id: 'debug', icon: Bug, label: 'Debug', description: '调试和排错' },
  { id: 'review', icon: ShieldCheck, label: 'Review', description: '代码审查' },
]

/** 自定义模式图标映射 */
const ICON_MAP: Record<string, typeof Code> = {
  Bot,
  Building2,
  GraduationCap,
  Wrench,
  FileCode,
  TestTube,
  BookOpen,
  Sparkles,
}

/** 获取自定义模式图标组件 */
function getCustomModeIcon(iconName?: string): typeof Code {
  return ICON_MAP[iconName || ''] || Bot
}

export function ModeSelector() {
  const { currentMode, changeMode } = useSessionStore()
  const { customModes } = useConfigStore()
  const [showCustomDropdown, setShowCustomDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomDropdown(false)
      }
    }
    if (showCustomDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomDropdown])

  // 判断当前模式是否为自定义模式
  const isCustomModeActive = customModes.some((m) => m.slug === currentMode)
  const activeCustomMode = customModes.find((m) => m.slug === currentMode)

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-[var(--bg-tertiary)] p-0.5">
      {/* 内置模式按钮 */}
      {BUILTIN_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => changeMode(mode.id)}
          className={cn(
            'flex h-6 items-center gap-1 rounded-sm px-2 text-[10px] font-medium transition-colors',
            currentMode === mode.id
              ? 'bg-[var(--brand-primary)] text-black'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          )}
          title={mode.description}
        >
          <mode.icon size={10} />
          <span>{mode.label}</span>
        </button>
      ))}

      {/* 自定义模式下拉 */}
      {customModes.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowCustomDropdown(!showCustomDropdown)}
            className={cn(
              'flex h-6 items-center gap-1 rounded-sm px-2 text-[10px] font-medium transition-colors',
              isCustomModeActive
                ? 'bg-[var(--brand-primary)] text-black'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            )}
          >
            {isCustomModeActive && activeCustomMode ? (
              <>
                {(() => {
                  const Icon = getCustomModeIcon(activeCustomMode.icon)
                  return <Icon size={10} />
                })()}
                <span>{activeCustomMode.name}</span>
              </>
            ) : (
              <>
                <Cog size={10} />
                <span>更多</span>
                <ChevronDown size={8} />
              </>
            )}
          </button>

          {/* 下拉菜单 */}
          {showCustomDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              {customModes.map((mode) => {
                const Icon = getCustomModeIcon(mode.icon)
                const isActive = currentMode === mode.slug
                return (
                  <button
                    key={mode.slug}
                    onClick={() => {
                      changeMode(mode.slug)
                      setShowCustomDropdown(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <Icon size={12} />
                    <div className="flex-1">
                      <p className="font-medium">{mode.name}</p>
                      {mode.description && (
                        <p className="text-[9px] text-[var(--text-tertiary)]">{mode.description}</p>
                      )}
                    </div>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
