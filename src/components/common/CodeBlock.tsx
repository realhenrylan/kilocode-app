import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * 代码块组件
 *
 * 带语法高亮和复制按钮的代码展示
 * Codex风格：深色背景、行号、语言标签
 */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--code-border)]">
      {/* 头部：语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between bg-[var(--code-bg)] px-3 py-1">
        <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded text-[10px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
        >
          {copied ? (
            <>
              <Check size={10} className="text-[var(--success)]" />
              <span className="text-[var(--success)]">已复制</span>
            </>
          ) : (
            <>
              <Copy size={10} />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 代码内容 */}
      <pre className="overflow-x-auto bg-[var(--code-bg)] p-3 text-xs leading-relaxed">
        <code className="text-[var(--text-primary)]">{code}</code>
      </pre>
    </div>
  )
}
