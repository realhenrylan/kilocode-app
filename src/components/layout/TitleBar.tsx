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
    <div className="titlebar-drag flex h-9 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] select-none">
      {/* 左侧：应用名称 + 拖拽区域 */}
      <div className="flex items-center gap-2 pl-4">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">KiloCode</span>
        </div>
      </div>

      {/* 中间：拖拽区域 */}
      <div className="flex-1" />

      {/* 右侧：窗口控制按钮 */}
      <div className="titlebar-no-drag flex items-center">
        <button
          onClick={handleMinimize}
          className="flex h-9 w-11 items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="最小化"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-9 w-11 items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={maximized ? '还原' : '最大化'}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="0" width="8" height="8" rx="0.5" />
              <rect x="0" y="2" width="8" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="flex h-9 w-11 items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--error)] hover:text-white transition-colors"
          aria-label="关闭"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  )
}
