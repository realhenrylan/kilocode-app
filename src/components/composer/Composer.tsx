import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { useConfigStore } from '@/stores/configStore'
import { Send, Paperclip, Mic, AtSign, Square, X, FileText, Image } from 'lucide-react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useInlineCompletion } from '@/hooks/useInlineCompletion'
import type { FileAttachment } from '@/types/kilo'

/**
 * Composer 输入组件
 *
 * 核心交互入口：用户输入 → sendMessage → 流式接收 → 渲染
 * 支持：多行输入、@文件引用、/斜杠命令、附件上传、语音输入
 */

/** 判断 MIME 类型是否为图片 */
function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

/** 判断 MIME 类型是否为文本（可读取为字符串） */
function isTextMime(mime: string): boolean {
  return mime.startsWith('text/')
    || mime === 'application/json'
    || mime === 'application/javascript'
    || mime === 'application/xml'
    || mime === 'application/x-yaml'
    || mime === 'application/typescript'
    || mime === 'application/x-python'
    || /\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|css|html|yaml|yml|toml|xml|sql|sh|bat|md|json|txt)$/i.test(mime)
}

/** 根据文件扩展名推断 MIME 类型 */
function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    ts: 'application/typescript', tsx: 'application/typescript',
    js: 'application/javascript', jsx: 'application/javascript',
    py: 'application/x-python', rs: 'text/rust',
    go: 'text/go', java: 'text/java',
    c: 'text/c', cpp: 'text/cpp', h: 'text/c',
    css: 'text/css', html: 'text/html',
    yaml: 'application/x-yaml', yml: 'application/x-yaml',
    toml: 'application/x-yaml', xml: 'application/xml',
    sql: 'text/sql', sh: 'text/shell', bat: 'text/bat',
    md: 'text/markdown', json: 'application/json', txt: 'text/plain',
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

/** 读取文件为 FileAttachment */
function readFileAsAttachment(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    const mimeType = file.type || inferMimeType(file.name)
    const isImage = isImageMime(mimeType)

    if (isImage || !isTextMime(mimeType)) {
      // 二进制文件：读取为 Base64
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || ''
        resolve({
          name: file.name,
          mimeType,
          size: file.size,
          content: base64,
          isBase64: true,
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    } else {
      // 文本文件：读取为字符串
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          name: file.name,
          mimeType,
          size: file.size,
          content: reader.result as string,
          isBase64: false,
        })
      }
      reader.onerror = reject
      reader.readAsText(file)
    }
  })
}

export function Composer() {
  const [value, setValue] = useState('')
  const [showSlashCommands, setShowSlashCommands] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentMode, isStreaming, sendMessage, cancelGeneration } = useSessionStore()

  /** 内联自动补全 */
  const { ghostText, requestCompletion, acceptSuggestion, dismissSuggestion } = useInlineCompletion()

  /** 语音输入 */
  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput(
    (transcript) => {
      setValue((prev) => prev + transcript)
    }
  )

  /** 自动调整文本框高度 */
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  /** 发送消息 */
  const handleSend = async () => {
    const trimmed = value.trim()
    if (!trimmed && attachments.length === 0) return

    // 清空输入框和附件
    const currentAttachments = attachments.length > 0 ? [...attachments] : undefined
    setValue('')
    setAttachments([])
    adjustHeight()

    // 调用 store 的 sendMessage（核心交互流程）
    await sendMessage(trimmed || '请分析附件内容', currentAttachments)
  }

  /** 键盘事件处理 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab 接受补全建议
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault()
      const accepted = acceptSuggestion()
      if (accepted) {
        setValue((prev) => prev + accepted)
      }
      return
    }
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      dismissSuggestion()
      if (isStreaming) {
        cancelGeneration()
      } else {
        handleSend()
      }
    }
    // Esc 中断流式输出
    if (e.key === 'Escape') {
      if (ghostText) {
        dismissSuggestion()
        return
      }
      if (isStreaming) {
        cancelGeneration()
      }
    }
    // / 触发斜杠命令
    if (e.key === '/' && value === '') {
      setShowSlashCommands(true)
    }
  }

  /** 输入变化处理 */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    setShowSlashCommands(newValue === '/')

    // 触发内联补全
    const cursorPos = e.target.selectionStart || newValue.length
    requestCompletion(newValue, cursorPos)
  }

  /** 斜杠命令选择 */
  const handleSlashCommand = (command: string) => {
    // 内置模式切换命令
    const builtinModeCommands: Record<string, string> = {
      '/code': 'code',
      '/plan': 'plan',
      '/ask': 'ask',
      '/debug': 'debug',
      '/review': 'review',
    }

    if (builtinModeCommands[command]) {
      useSessionStore.getState().changeMode(builtinModeCommands[command])
      setValue('')
      setShowSlashCommands(false)
      textareaRef.current?.focus()
      return
    }

    // 自定义模式切换命令（/slug 格式）
    const customModes = useConfigStore.getState().customModes
    const customSlug = command.slice(1) // 去掉 /
    const customMode = customModes.find((m) => m.slug === customSlug)
    if (customMode) {
      useSessionStore.getState().changeMode(customMode.slug)
      setValue('')
      setShowSlashCommands(false)
      textareaRef.current?.focus()
      return
    }

    // 其他命令作为消息发送
    setValue(command + ' ')
    setShowSlashCommands(false)
    textareaRef.current?.focus()
  }

  /** 处理文件附件选择 */
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 读取所有选中文件
    const newAttachments: FileAttachment[] = []
    for (let i = 0; i < files.length; i++) {
      try {
        const attachment = await readFileAsAttachment(files[i])
        newAttachments.push(attachment)
      } catch (err) {
        console.error('[Composer] Failed to read file:', files[i].name, err)
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments])

    // 重置 input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /** 移除附件 */
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  /** 格式化文件大小 */
  const formatSize = (bytes: number): string => {
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${bytes}B`
  }

  return (
    <div className="relative px-4 py-3">
      {/* 斜杠命令弹窗 */}
      {showSlashCommands && (
        <SlashCommandPopup
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashCommands(false)}
        />
      )}

      {/* 附件预览条 */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((att, idx) => (
            <div
              key={`${att.name}-${idx}`}
              className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs"
            >
              {isImageMime(att.mimeType) ? (
                <Image size={12} className="text-[var(--brand-primary)]" />
              ) : (
                <FileText size={12} className="text-[var(--accent)]" />
              )}
              <span className="max-w-[120px] truncate text-[var(--text-secondary)]">{att.name}</span>
              <span className="text-[var(--text-tertiary)]">{formatSize(att.size)}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="ml-0.5 rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)]"
                aria-label="移除附件"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 transition-colors focus-within:border-[var(--input-focus-border)]">
        {/* 附件按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          aria-label="添加附件"
        >
          <Paperclip size={14} />
        </button>
        {/* 隐藏的文件选择 input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.rs,.go,.java,.c,.cpp,.h,.css,.html,.yaml,.yml,.toml,.xml,.sql,.sh,.bat,.png,.jpg,.jpeg,.gif,.webp,.svg"
          onChange={handleAttachmentSelect}
          className="hidden"
        />

        {/* 文本输入（含 ghost text 补全） */}
        <div className="relative max-h-[200px] min-h-[28px] flex-1">
          {/* Ghost text 层：补全建议以半透明文字显示 */}
          {ghostText && !isStreaming && (
            <div className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words px-0 py-0 text-sm text-[var(--text-tertiary)] opacity-40" aria-hidden="true">
              <span className="invisible">{value}</span>
              <span>{ghostText}</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          placeholder={`输入消息...（当前模式：${currentMode}）`}
          className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          rows={1}
        />
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {/* @ 引用 */}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            aria-label="引用文件"
          >
            <AtSign size={14} />
          </button>

          {/* 语音输入 */}
          {voiceSupported && (
            <button
              onClick={toggleListening}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                isListening
                  ? 'bg-[var(--error-muted)] text-[var(--error)] animate-pulse'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
              )}
              aria-label={isListening ? '停止语音输入' : '语音输入'}
            >
              <Mic size={14} />
            </button>
          )}

          {/* 发送/停止按钮 */}
          {isStreaming ? (
            <button
              onClick={cancelGeneration}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--error)] text-white transition-colors hover:bg-[var(--error)]"
              aria-label="停止生成"
            >
              <Square size={12} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim() && attachments.length === 0}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                value.trim() || attachments.length > 0
                  ? 'bg-[var(--brand-primary)] text-black hover:bg-[var(--brand-hover)]'
                  : 'text-[var(--text-tertiary)]'
              )}
              aria-label="发送"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-[var(--text-tertiary)]">
        <span>Enter 发送 · Shift+Enter 换行 · / 命令 · @ 引用 · 📎 附件{ghostText ? ' · Tab 补全' : ''}</span>
        {isStreaming && <span className="text-[var(--brand-primary)]">Esc 或点击 ■ 停止</span>}
      </div>
    </div>
  )
}

/** 斜杠命令弹窗 */
function SlashCommandPopup({
  onSelect,
  onClose,
}: {
  onSelect: (command: string) => void
  onClose: () => void
}) {
  const { customModes } = useConfigStore()

  // 内置命令
  const builtinCommands = [
    { command: '/code', description: '切换到 Code 模式' },
    { command: '/plan', description: '切换到 Plan 模式' },
    { command: '/ask', description: '切换到 Ask 模式' },
    { command: '/debug', description: '切换到 Debug 模式' },
    { command: '/review', description: '切换到 Review 模式' },
  ]

  // 自定义模式命令
  const customCommands = customModes.map((mode) => ({
    command: `/${mode.slug}`,
    description: `切换到 ${mode.name} 模式${mode.description ? ` — ${mode.description}` : ''}`,
  }))

  // 通用命令
  const generalCommands = [
    { command: '/clear', description: '清空当前对话' },
    { command: '/compact', description: '压缩对话上下文' },
    { command: '/fork', description: '分叉当前会话' },
    { command: '/model', description: '切换模型' },
    { command: '/help', description: '显示帮助信息' },
  ]

  return (
    <div className="absolute bottom-full left-4 right-4 z-50 mb-2 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg">
      <div className="p-1">
        <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">模式切换</p>
        {builtinCommands.map((cmd) => (
          <button
            key={cmd.command}
            onClick={() => onSelect(cmd.command)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
          >
            <span className="font-mono text-[var(--brand-primary)]">{cmd.command}</span>
            <span className="text-[var(--text-tertiary)]">{cmd.description}</span>
          </button>
        ))}
        {customCommands.length > 0 && (
          <>
            <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">自定义模式</p>
            {customCommands.map((cmd) => (
              <button
                key={cmd.command}
                onClick={() => onSelect(cmd.command)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
              >
                <span className="font-mono text-[var(--brand-primary)]">{cmd.command}</span>
                <span className="text-[var(--text-tertiary)]">{cmd.description}</span>
              </button>
            ))}
          </>
        )}
        <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">通用命令</p>
        {generalCommands.map((cmd) => (
          <button
            key={cmd.command}
            onClick={() => onSelect(cmd.command)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
          >
            <span className="font-mono text-[var(--brand-primary)]">{cmd.command}</span>
            <span className="text-[var(--text-tertiary)]">{cmd.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
