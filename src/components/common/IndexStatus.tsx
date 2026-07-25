import { useIndexStore } from '@/stores/indexStore'
import { Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

/**
 * 代码库索引状态组件
 *
 * 显示在状态栏中，展示索引状态和文件数量
 * 点击可触发索引构建
 */
export function IndexStatus() {
  const { indexed, fileCount, lastIndexed, isBuilding, buildProgress, error, loadIndexStatus, triggerIndexing } = useIndexStore()

  // 首次加载时获取状态
  useEffect(() => {
    loadIndexStatus()
  }, [loadIndexStatus])

  /** 格式化时间 */
  const formatTime = (iso: string | null): string => {
    if (!iso) return '未索引'
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}小时前`
    return date.toLocaleDateString()
  }

  return (
    <button
      onClick={triggerIndexing}
      className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] transition-colors hover:bg-[var(--bg-hover)]"
      title={indexed ? `已索引 ${fileCount} 个文件 · ${formatTime(lastIndexed)}` : '点击构建索引'}
    >
      {isBuilding ? (
        <>
          <RefreshCw size={10} className="animate-spin text-[var(--brand-primary)]" />
          <span className="text-[var(--brand-primary)]">索引中 {buildProgress}%</span>
        </>
      ) : error ? (
        <>
          <AlertCircle size={10} className="text-[var(--error)]" />
          <span className="text-[var(--error)]">索引错误</span>
        </>
      ) : indexed ? (
        <>
          <CheckCircle size={10} className="text-[var(--success)]" />
          <span className="text-[var(--text-tertiary)]">{fileCount} 文件</span>
        </>
      ) : (
        <>
          <Database size={10} className="text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-tertiary)]">未索引</span>
        </>
      )}
    </button>
  )
}
