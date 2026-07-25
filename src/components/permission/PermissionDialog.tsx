import { cn } from '@/utils/cn'
import type { PermissionRequest, PermissionDecision } from '@/types/kilo'
import { Shield, Check, X, ShieldCheck } from 'lucide-react'

/**
 * 权限请求弹窗
 *
 * 当 AI 工具调用需要用户授权时弹出
 * Codex风格：模态弹窗，清晰展示操作详情
 */
export function PermissionDialog({
  request,
  onDecision,
}: {
  request: PermissionRequest
  onDecision: (id: string, decision: PermissionDecision) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)]">
      <div className="mx-4 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* 复制
        {/* 头部 */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
          <Shield size={16} className="text-[var(--warning)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">权限请求</h3>
        </div>

        {/* 内容 */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            KiloCode 请求执行以下操作：
          </p>
          <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
            <p className="mb-1 text-xs font-medium text-[var(--brand-primary)]">{request.toolName}</p>
            <p className="text-xs text-[var(--text-secondary)]">{request.description}</p>
            <pre className="mt-2 overflow-x-auto rounded bg-[var(--code-bg)] p-2 text-[10px] text-[var(--text-tertiary)]">
              {JSON.stringify(request.input, null, 2)}
            </pre>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-4 py-3">
          <button
            onClick={() => onDecision(request.id, 'deny')}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <X size={12} />
            拒绝
          </button>
          <button
            onClick={() => onDecision(request.id, 'always-allow')}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <ShieldCheck size={12} />
            始终允许
          </button>
          <button
            onClick={() => onDecision(request.id, 'allow')}
            className="flex items-center gap-1.5 rounded-md bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[var(--brand-hover)]"
          >
            <Check size={12} />
            允许
          </button>
        </div>
      </div>
    </div>
  )
}
