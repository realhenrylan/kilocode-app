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
    <div className="my-2.5 overflow-hidden rounded-[10px] border border-[var(--border-subtle)]">
      {/* 头部：语言标签 + 复制按钮 */}
      <div className="flex items-center border-b border-[var(--border-subtle)] bg-[var(--code-bg)] px-3 py-1.5">
        <span className="font-mono text-[11.5px] text-[var(--text-tertiary)]">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1 rounded text-[11.5px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
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
      <pre className="overflow-x-auto bg-[var(--code-bg)] px-3.5 py-3 text-[12px] leading-[1.7] text-[#C8C6BE]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
