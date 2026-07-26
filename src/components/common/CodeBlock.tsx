import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * 代码块组件
 *
 * 带语法高亮和复制按钮的代码展示
 * Codex风格：深色背景、行号、语言标签
 */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="kc-codeblock">
      {/* 头部：语言标签 + 复制按钮 */}
      <div className="kc-code-head">
        <span className="kc-code-label">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="kc-code-copy"
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
      <pre className="kc-code-pre">
        <code>
          {lines.map((line, index) => (
            <span key={`${index}-${line}`}>
              {highlightLine(line)}
              {index < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function highlightLine(line: string) {
  const tokenPattern = /(\/\/.*$|`[^`]*`|'[^']*'|"[^"]*"|\b(?:const|let|return|function|string|number|boolean)\b|\b(?:shardedStorage|getItem|setItem)\b)/g
  return line.split(tokenPattern).map((part, index) => {
    if (!part) return null
    let className = ''
    if (part.startsWith('//')) className = 'tk-cm'
    else if (/^(?:`|'|")/.test(part)) className = 'tk-str'
    else if (/^(?:const|let|return|function|string|number|boolean)$/.test(part)) className = 'tk-kw'
    else if (/^(?:shardedStorage|getItem|setItem)$/.test(part)) className = 'tk-fn'
    return <span key={`${index}-${part}`} className={className}>{part}</span>
  })
}
