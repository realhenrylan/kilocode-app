import { useToastStore, type ToastType } from '@/stores/toastStore'
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'

/**
 * Toast 通知组件
 *
 * 固定在窗口右上角，支持 info/success/warning/error 四种类型
 * 自动消失（3 秒），可手动关闭
 */

const iconMap: Record<ToastType, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
}

const colorMap: Record<ToastType, string> = {
  info: 'text-[var(--accent)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  error: 'text-[var(--error)]',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-12 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        return (
          <div
            key={toast.id}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 shadow-lg toast-enter"
            role="alert"
          >
            <Icon size={14} className={colorMap[toast.type]} />
            <span className="text-xs text-[var(--text-primary)]">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-1 rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              aria-label="关闭通知"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
