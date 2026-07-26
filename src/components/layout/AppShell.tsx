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
    <div className="kc-app">
      {/* 自定义标题栏 */}
      <TitleBar />

      {/* 主体区域 */}
      <div className="kc-app-body">
        {/* 左侧边栏 */}
        <div
          className={cn(
            'kc-sidebar-pane',
            sidebarCollapsed && 'is-collapsed'
          )}
        >
          <Sidebar />
        </div>

        {/* 中间主面板 */}
        <div className="kc-main-pane">
          <MainPanel />
        </div>

        {/* 右侧工作抽屉（440px，按需唤出 + 滑入动画）*/}
        <div
          className={cn(
            'kc-drawer-pane',
            rightPanelVisible && 'is-visible'
          )}
        >
          {rightPanelVisible && <RightPanel />}
        </div>
      </div>
    </div>
  )
}
