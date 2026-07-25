import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { StatusBar } from './StatusBar'
import { useUiStore } from '@/stores/uiStore'

/**
 * 应用主布局框架
 *
 * Codex风格三栏布局：
 * - 左侧边栏：会话列表、模式切换、项目选择
 * - 中间主区域：对话流 + Composer
 * - 右侧面板：终端 / Diff / 文件（可折叠）
 */
export function AppShell() {
  const { sidebarCollapsed, rightPanelVisible } = useUiStore()

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 自定义标题栏 */}
      <TitleBar />

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <div
          className={cn(
            'flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)] transition-all duration-200',
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-60'
          )}
        >
          <Sidebar />
        </div>

        {/* 中间主面板 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <MainPanel />
        </div>

        {/* 右侧面板（可折叠）*/}
        {rightPanelVisible && (
          <div className="flex w-96 flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <RightPanel />
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  )
}
