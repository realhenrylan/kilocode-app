import { useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { FolderOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * 项目选择器
 *
 * 选择当前工作目录
 * Codex风格：紧凑下拉，显示当前项目路径
 */
export function ProjectPicker() {
  const { workingDir, setWorkingDir } = useSessionStore()
  const [open, setOpen] = useState(false)

  const handleSelectDir = async () => {
    try {
      const dir = typeof window !== 'undefined' && window.api?.fs
        ? await window.api.fs.selectDirectory()
        : null
      if (dir) {
        setWorkingDir(dir)
      }
    } catch {
      // 非Electron环境或用户取消
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
      >
        <FolderOpen size={10} />
        <span className="truncate">{workingDir || '选择项目目录'}</span>
        <ChevronDown size={8} className="flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-1 shadow-lg">
          <button
            onClick={handleSelectDir}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
          >
            <FolderOpen size={12} />
            <span>浏览目录...</span>
          </button>
        </div>
      )}
    </div>
  )
}
