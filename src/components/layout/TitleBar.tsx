import { useState, useEffect } from 'react'
import { cn } from '@/utils/cn'

/**
 * 自定义标题栏组件
 *
 * 无边框窗口的拖拽区域 + 窗口控制按钮
 * Codex风格：极简、融入背景
 *
 * 注意：在浏览器预览模式下，window.api 不可用，需要安全检查
 */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false)
  const isElectron = typeof window !== 'undefined' && !!window.api?.window

  useEffect(() => {
    if (!isElectron) return
    window.api.window.onMaximizeChange((isMax) => setMaximized(isMax))
  }, [isElectron])

  const handleMinimize = () => isElectron && window.api.window.minimize()
  const handleMaximize = async () => {
    if (!isElectron) return
    const isMax = await window.api.window.isMaximized()
    setMaximized(!isMax)
    window.api.window.maximize()
  }
  const handleClose = () => isElectron && window.api.window.close()

  return (
	    <div className="titlebar-drag flex h-[38px] items-center justify-end gap-0.5 border-b border-[var(--divider)] bg-[var(--bg-primary)] select-none pr-1.5">
      {/* 右侧：窗口控制按钮（设计稿风格：stroke SVG） */}
      <div className="titlebar-no-drag flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          className="flex h-[30px] w-[42px] items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
          aria-label="最小化"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M4 8h8" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-[30px] w-[42px] items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
          aria-label={maximized ? '还原' : '最大化'}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="4" y="4" width="8" height="8" rx="1" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="flex h-[30px] w-[42px] items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--error)] hover:text-white"
          aria-label="关闭"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
