import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { useSessionStore } from '@/stores/sessionStore'
import { SessionList } from '@/components/sidebar/SessionList'
import { ProjectPicker } from '@/components/sidebar/ProjectPicker'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import {
  Settings,
  PanelRightOpen,
  Plus,
} from 'lucide-react'

/**
 * 左侧边栏（Codex V2.3 瘦身版）
 *
 * 模式/模型选择器已迁入 Composer 底部胶囊
 * 侧边栏只保留：Logo、新建任务、搜索、会话列表、底部项目+操作
 * 宽度 256px，Logo 使用 KiloCode 官方 logo
 */
export function Sidebar() {
  const { setSettingsOpen, toggleRightPanel, rightPanelVisible } = useUiStore()
  const { createNewSession } = useSessionStore()

  return (
    <div className="flex h-full flex-col">
      {/* Logo + 新建任务 + 搜索 */}
      <div className="border-b border-[var(--divider)] px-2.5 pb-3 pt-3">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 pb-3.5">
          {/* KiloCode 官方 logo：亮黄圆角方块 + 像素风 K */}
          <div className="h-[22px] w-[22px] flex-shrink-0">
            <svg viewBox="0 0 24 24" role="img" aria-label="KiloCode" className="h-full w-full">
              <rect width="24" height="24" rx="6" fill="#F7F569" />
              <path fill="#16161C" d="M3 3h6v3H3zM15 3h6v3h-6zM3 6h6v3H3zM12 6h6v3h-6zM3 9h12v3H3zM3 12h12v3H3zM3 15h6v3H3zM12 15h6v3h-6zM3 18h6v3H3zM15 18h6v3h-6z" />
            </svg>
          </div>
          <span className="text-[13.5px] font-semibold tracking-[-0.01em]">KiloCode</span>
        </div>

        {/* 新建任务按钮 */}
        <button onClick={createNewSession} className="flex w-full items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]">
          <Plus size={13} className="text-[var(--text-secondary)]" />
          <span>新建任务</span>
        </button>
      </div>

      {/* 会话列表（含搜索） */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
        <SessionList />
      </div>

      {/* 底部区域 */}
      <div className="border-t border-[var(--divider)] px-2.5 py-2">
        {/* 项目选择 */}
        <ProjectPicker />

        {/* 操作按钮行 */}
        <div className="mt-1 flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              aria-label="设置"
            >
              <Settings size={14} />
            </button>
          </div>
          {!rightPanelVisible && (
            <button
              onClick={toggleRightPanel}
              className="flex h-7 items-center justify-center rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
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
