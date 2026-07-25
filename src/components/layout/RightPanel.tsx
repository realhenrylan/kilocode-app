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
    <div className="flex h-full w-full flex-col bg-[#1F1E1B]">
      {/* 抽屉头部：分段控件 + 关闭按钮 */}
      <div className="flex h-[46px] flex-shrink-0 items-center gap-2 border-b border-[var(--divider)] px-3">
        {/* 分段控件 */}
        <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.04)] p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanelTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-[5px] text-xs transition-colors',
                rightPanelTab === tab.id
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
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
          className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
          aria-label="关闭抽屉"
        >
          <X size={14} />
        </button>
      </div>

      {/* 抽屉内容 */}
      <div className="flex-1 overflow-hidden p-3">
        {rightPanelTab === 'terminal' && <TerminalPanel />}
        {rightPanelTab === 'browser' && <BrowserPanel />}
        {rightPanelTab === 'diff' && <DiffViewer />}
        {rightPanelTab === 'files' && <FileTree />}
      </div>
    </div>
  )
}
