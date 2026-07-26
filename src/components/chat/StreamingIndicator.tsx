/**
 * 流式输出指示器
 *
 * Codex风格：显示在消息列内，无独立边框
 * 与消息流对齐（居中 720px），shimmer 动画
 */
export function StreamingIndicator() {
  return (
    <div className="kc-stream">
      <div className="kc-chat-col kc-stream-inner">
        <span className="shimmer-text">正在更新会话索引的迁移逻辑…</span>
      </div>
    </div>
  )
}
