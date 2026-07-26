import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { TerminalPanel } from '@/components/terminal/TerminalPanel'
import { DiffViewer } from '@/components/diff/DiffViewer'
import { FileTree } from '@/components/common/FileTree'
import { BrowserPanel } from '@/components/browser/BrowserPanel'
import { Terminal, GitCompare, FolderTree, Globe, X } from 'lucide-react'

/**
 * 右侧工作抽屉（Codex V2.3 风格）
 *
 * 按需唤出的 440px 工作抽屉，顶部分段控件切换
 * 左侧 --divider 发丝线与主区相隔
 * 抽屉打开时对话列自动收窄
 */
export function RightPanel() {
  const { rightPanelTab, setRightPanelTab, toggleRightPanel } = useUiStore()

  const tabs = [
    { id: 'terminal' as const, icon: Terminal, label: '终端' },
    { id: 'diff' as const, icon: GitCompare, label: '差异' },
    { id: 'browser' as const, icon: Globe, label: '浏览器' },
    { id: 'files' as const, icon: FolderTree, label: '文件' },
  ]

  return (
    <div className="kc-drawer">
      {/* 抽屉头部：分段控件 + 关闭按钮 */}
      <div className="kc-drawer-head">
        {/* 分段控件 */}
        <div className="kc-segmented">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanelTab(tab.id)}
              className={cn(
                'kc-segmented-item',
                rightPanelTab === tab.id
                  ? 'is-active'
                  : ''
              )}
            >
              <tab.icon size={12} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={toggleRightPanel}
          className="kc-icon-btn kc-drawer-close"
          aria-label="关闭抽屉"
        >
          <X size={14} />
        </button>
      </div>

      {/* 抽屉内容 */}
      <div className="kc-drawer-body">
        {rightPanelTab === 'terminal' && <TerminalPanel />}
        {rightPanelTab === 'browser' && <BrowserPanel />}
        {rightPanelTab === 'diff' && <DiffViewer />}
        {rightPanelTab === 'files' && <FileTree />}
      </div>
    </div>
  )
}
