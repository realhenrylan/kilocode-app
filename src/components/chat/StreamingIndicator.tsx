/**
 * 流式输出指示器
 *
 * Codex风格：显示在消息列内，无独立边框
 * 与消息流对齐（居中 720px），shimmer 动画
 */
export function StreamingIndicator() {
  return (
    <div className="flex w-full justify-center px-6 pb-3">
      <div className="flex w-full max-w-[720px] items-center gap-2.5 text-[13px]">
        <svg className="h-3 w-3 animate-spin text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="shimmer-text">正在思考</span>
        <span className="text-[10px] text-[var(--text-tertiary)]">按 Esc 中断</span>
      </div>
    </div>
  )
}
