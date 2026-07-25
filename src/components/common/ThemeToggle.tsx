import { useUiStore } from '@/stores/uiStore'
import { useTheme } from '@/hooks/useTheme'
import type { ThemeMode } from '@/types/kilo'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * 主题切换组件
 *
 * 三态切换：Dark / Light / System（跟随系统）
 * 侧边栏底部显示，Codex风格极简图标
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: 'dark', icon: Moon, label: '深色' },
    { value: 'light', icon: Sun, label: '浅色' },
    { value: 'system', icon: Monitor, label: '跟随系统' },
  ]

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-[var(--bg-tertiary)] p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setTheme(mode.value)}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-sm transition-colors',
            theme === mode.value
              ? 'bg-[var(--brand-primary)] text-black'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          )}
          aria-label={mode.label}
          title={mode.label}
        >
          <mode.icon size={10} />
        </button>
      ))}
    </div>
  )
}
