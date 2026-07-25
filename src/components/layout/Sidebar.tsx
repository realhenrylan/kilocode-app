import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ModeSelector } from '@/components/sidebar/ModeSelector'
import { SessionList } from '@/components/sidebar/SessionList'
import { ModelSelector } from '@/components/sidebar/ModelSelector'
import { ProjectPicker } from '@/components/sidebar/ProjectPicker'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import {
  Settings,
  PanelRightOpen,
  MessageSquarePlus,
} from 'lucide-react'

/**
 * 左侧边栏
 *
 * Codex风格：深色背景、品牌黄激活色、极简图标
 * 包含：Logo、模式选择、会话列表、项目选择、模型选择、底部操作
 */
export function Sidebar() {
  const { setSettingsOpen, toggleRightPanel, rightPanelVisible } = useUiStore()
  const { currentMode, createNewSession } = useSessionStore()

  return (
    <div className="flex h-full flex-col">
      {/* Logo 区域 */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary)]">
          <span className="text-xs font-bold text-black">K</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">KiloCode</h1>
          <p className="text-[10px] text-[var(--text-tertiary)]">AI Coding Agent</p>
        </div>
      </div>

      {/* 新建会话按钮 */}
      <div className="px-3 py-2">
        <button onClick={createNewSession} className="flex w-full items-center gap-2 rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand-primary)]">
          <MessageSquarePlus size={14} />
          <span>新建会话</span>
        </button>
      </div>

      {/* 模式选择 */}
      <div className="px-3 py-1">
        <ModeSelector />
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <SessionList />
      </div>

      {/* 底部区域 */}
      <div className="border-t border-[var(--border-subtle)]">
        {/* 项目选择 */}
        <div className="px-3 py-2">
          <ProjectPicker />
        </div>

        {/* 模型选择 */}
        <div className="px-3 py-1">
          <ModelSelector />
        </div>

        {/* 操作按钮行 */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-7 w-7 items-center justify-center items-center rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              aria-label="设置"
            >
              <Settings size={14} />
            </button>
          </div>
          {!rightPanelVisible && (
            <button
              onClick={toggleRightPanel}
              className="flex h-7 items-center justify-center rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              aria-label="打开右侧面板"
            >
              <PanelRightOpen size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
