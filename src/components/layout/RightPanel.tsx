import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { TerminalPanel } from '@/components/terminal/TerminalPanel'
import { DiffViewer } from '@/components/diff/DiffViewer'
import { FileTree } from '@/components/common/FileTree'
import { BrowserPanel } from '@/components/browser/BrowserPanel'
import { Terminal, GitCompare, FolderTree, Globe, X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * 右侧工作抽屉（Codex V2.3 风格）
 *
 * 按需唤出的 440px 工作抽屉，顶部分段控件切换
 * 左侧 --divider 发丝线与主区相隔
 * 抽屉打开时对话列自动收窄
 */
export function RightPanel() {
  const { rightPanelTab, setRightPanelTab, toggleRightPanel, rightPanelVisible } = useUiStore()

  // 抽屉展开后触发终端尺寸适配
  // CSS transition 完成后通知终端 fit，确保 xterm 正确填充容器
  useEffect(() => {
    if (rightPanelVisible && rightPanelTab === 'terminal') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('terminal:fit'))
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [rightPanelVisible, rightPanelTab])

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

      {/* 抽屉内容：所有面板始终挂载，通过 CSS 控制显隐 */}
      {/* 避免切换 tab 时销毁终端/webview 实例，保留运行时状态 */}
      <div className="kc-drawer-body">
        <div className={rightPanelTab === 'terminal' ? '' : 'hidden'}>
          <TerminalPanel />
        </div>
        <div className={rightPanelTab === 'browser' ? '' : 'hidden'}>
          <BrowserPanel />
        </div>
        <div className={rightPanelTab === 'diff' ? '' : 'hidden'}>
          <DiffViewer />
        </div>
        <div className={rightPanelTab === 'files' ? '' : 'hidden'}>
          <FileTree />
        </div>
      </div>
    </div>
  )
}
