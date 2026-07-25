import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { TerminalPanel } from '@/components/terminal/TerminalPanel'
import { DiffViewer } from '@/components/diff/DiffViewer'
import { FileTree } from '@/components/common/FileTree'
import { BrowserPanel } from '@/components/browser/BrowserPanel'
import { Terminal, GitCompare, FolderTree, Globe, X } from 'lucide-react'

/**
 * 右侧面板
 *
 * 可折叠面板，包含终端、Diff查看器、文件树、浏览器控制四个标签页
 * Codex风格：与主区域通过细边框分隔
 */
export function RightPanel() {
  const { rightPanelTab, setRightPanelTab, toggleRightPanel } = useUiStore()

  const tabs = [
    { id: 'terminal' as const, icon: Terminal, label: '终端' },
    { id: 'browser' as const, icon: Globe, label: '浏览器' },
    { id: 'diff' as const, icon: GitCompare, label: 'Diff' },
    { id: 'files' as const, icon: FolderTree, label: '文件' },
  ]

  return (
    <div className="flex h-full w-full flex-col">
      {/* 标签栏 */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanelTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors',
                rightPanelTab === tab.id
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleRightPanel}
          className="mr-2 flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          aria-label="关闭面板"
        >
          <X size={12} />
        </button>
      </div>

      {/* 标签内容 */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'terminal' && <TerminalPanel />}
        {rightPanelTab === 'browser' && <BrowserPanel />}
        {rightPanelTab === 'diff' && <DiffViewer />}
        {rightPanelTab === 'files' && <FileTree />}
      </div>
    </div>
  )
}
