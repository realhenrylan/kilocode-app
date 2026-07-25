/**
 * 流式输出指示器
 *
 * Codex风格 shimmer 动画效果
 * 显示在 Composer 上方，表示 AI 正在工作
 */
export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-1.5">
      <div className="flex items-center gap-1.5">
        {/* 旋转加载器 */}
        <svg className="h-3 w-3 animate-spin text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {/* Shimmer 文本 */}
        <span className="shimmer-text text-xs font-medium">正在思考</span>
      </div>
      <span className="text-[10px] text-[var(--text-tertiary)]">按 Esc 中断</span>
    </div>
  )
}
