import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { useUiStore } from '@/stores/uiStore'

/**
 * 应用主布局框架（Codex V2.3 风格）
 *
 * 三栏布局：
 * - 左侧边栏 256px：会话列表、项目选择
 * - 中间主区域：对话流 + Composer（对话列居中 720px）
 * - 右侧工作抽屉 440px：按需唤出，分段控件切换
 * - 无 StatusBar，费用/token 信息在 Composer 提示行
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
            'flex-shrink-0 border-r border-[var(--divider)] bg-[var(--sidebar-bg)] transition-all duration-200',
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          )}
        >
          <Sidebar />
        </div>

        {/* 中间主面板 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <MainPanel />
        </div>

        {/* 右侧工作抽屉（440px，按需唤出 + 滑入动画）*/}
        <div
          className={cn(
            'flex-shrink-0 border-l border-[var(--divider)] transition-all duration-200 overflow-hidden',
            rightPanelVisible ? 'w-[440px]' : 'w-0'
          )}
        >
          {rightPanelVisible && <RightPanel />}
        </div>
      </div>
    </div>
  )
}
