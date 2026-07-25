import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { useConfigStore } from '@/stores/configStore'
import { useTokenUsageStore, formatTokenCount, formatCost } from '@/stores/tokenUsageStore'
import { Send, Paperclip, Mic, AtSign, Square, X, FileText, Image, ChevronDown, Code, Lightbulb, HelpCircle, Bug, ShieldCheck, Cpu, Search, Zap, Brain, Sparkles } from 'lucide-react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useInlineCompletion } from '@/hooks/useInlineCompletion'
import type { FileAttachment, BuiltinMode, CustomMode } from '@/types/kilo'

/**
 * Composer 输入组件（Codex V2.3 风格）
 *
 * 核心交互入口：用户输入 → sendMessage → 流式接收 → 渲染
 * Codex 标志性布局：浮起大圆角卡 + 模式/模型胶囊内置底部
 * - 外层：radius 18px、--bg-secondary 底色、--border 描边、常驻投影
 * - 输入区与控件区用 --border-hairline 发丝线分隔
 * - 发送按钮：空闲灰圆形 → 有内容品牌黄圆形 + 柔光
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

/** 内置模式定义（用于胶囊下拉） */
const BUILTIN_MODES: { id: BuiltinMode; icon: typeof Code; label: string }[] = [
  { id: 'code', icon: Code, label: 'Code' },
  { id: 'plan', icon: Lightbulb, label: 'Plan' },
  { id: 'ask', icon: HelpCircle, label: 'Ask' },
  { id: 'debug', icon: Bug, label: 'Debug' },
  { id: 'review', icon: ShieldCheck, label: 'Review' },
]

export function Composer() {
  const [value, setValue] = useState('')
  const [showSlashCommands, setShowSlashCommands] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const { currentMode, currentModel, isStreaming, sendMessage, cancelGeneration, changeMode, changeModel } = useSessionStore()
  const { models, providers, customModes } = useConfigStore()
  const { usage } = useTokenUsageStore()

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

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /** 发送消息 */
  const handleSend = async () => {
    const trimmed = value.trim()
    if (!trimmed && attachments.length === 0) return

    const currentAttachments = attachments.length > 0 ? [...attachments] : undefined
    setValue('')
    setAttachments([])
    adjustHeight()

    await sendMessage(trimmed || '请分析附件内容', currentAttachments)
  }

  /** 键盘事件处理 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault()
      const accepted = acceptSuggestion()
      if (accepted) {
        setValue((prev) => prev + accepted)
      }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      dismissSuggestion()
      if (isStreaming) {
        cancelGeneration()
      } else {
        handleSend()
      }
    }
    if (e.key === 'Escape') {
      if (ghostText) {
        dismissSuggestion()
        return
      }
      if (isStreaming) {
        cancelGeneration()
      }
    }
    if (e.key === '/' && value === '') {
      setShowSlashCommands(true)
    }
  }

  /** 输入变化处理 */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    setShowSlashCommands(newValue === '/')

    const cursorPos = e.target.selectionStart || newValue.length
    requestCompletion(newValue, cursorPos)
  }

  /** 斜杠命令选择 */
  const handleSlashCommand = (command: string) => {
    const builtinModeCommands: Record<string, string> = {
      '/code': 'code',
      '/plan': 'plan',
      '/ask': 'ask',
      '/debug': 'debug',
      '/review': 'review',
    }

    if (builtinModeCommands[command]) {
      changeMode(builtinModeCommands[command])
      setValue('')
      setShowSlashCommands(false)
      textareaRef.current?.focus()
      return
    }

    const customSlug = command.slice(1)
    const customMode = customModes.find((m) => m.slug === customSlug)
    if (customMode) {
      changeMode(customMode.slug)
      setValue('')
      setShowSlashCommands(false)
      textareaRef.current?.focus()
      return
    }

    if (command === '/fork') {
      const { activeSessionId, forkSession } = useSessionStore.getState()
      if (activeSessionId) {
        forkSession(activeSessionId)
      }
      setValue('')
      setShowSlashCommands(false)
      textareaRef.current?.focus()
      return
    }

    setValue(command + ' ')
    setShowSlashCommands(false)
    textareaRef.current?.focus()
  }

  /** 处理文件附件选择 */
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

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

  /** 获取当前模式显示信息 */
  const activeModeInfo = (() => {
    const builtin = BUILTIN_MODES.find(m => m.id === currentMode)
    if (builtin) return builtin
    const custom = customModes.find(m => m.slug === currentMode)
    if (custom) return { id: custom.slug as BuiltinMode, icon: Code, label: custom.name }
    return BUILTIN_MODES[0] // 默认 Code
  })()

  /** 按提供商分组的模型列表 */
  const groupedModels = (() => {
    const query = modelSearchQuery.toLowerCase()
    const filtered = query
      ? models.filter(m =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query)
        )
      : models

    const groups: Record<string, typeof models> = {}
    for (const model of filtered) {
      const provider = model.provider
      if (!groups[provider]) groups[provider] = []
      groups[provider].push(model)
    }
    return groups
  })()

  /** 提供商显示名称映射 */
  const providerNames = (() => {
    const names: Record<string, string> = {}
    for (const p of providers) {
      names[p.id] = p.name
    }
    return names
  })()

  const hasContent = value.trim().length > 0 || attachments.length > 0

  return (
    <div className="flex flex-col items-center px-6 pb-1.5 pt-2.5">
      {/* 斜杠命令弹窗 */}
      {showSlashCommands && (
        <SlashCommandPopup
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashCommands(false)}
        />
      )}

      {/* Composer 浮起大圆角卡 */}
      <div className="w-full max-w-[720px] rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow)]" style={{ padding: '14px 14px 10px' }}>
        {/* 附件预览条 */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att, idx) => (
              <div
                key={`${att.name}-${idx}`}
                className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs"
              >
                {isImageMime(att.mimeType) ? (
                  <Image size={12} className="text-[var(--text-secondary)]" />
                ) : (
                  <FileText size={12} className="text-[var(--text-secondary)]" />
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
        <div className="relative min-h-[38px]">
          {/* Ghost text 层 */}
          {ghostText && !isStreaming && (
            <div className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-[13.5px] text-[var(--text-tertiary)] opacity-40" aria-hidden="true">
              <span className="invisible">{value}</span>
              <span>{ghostText}</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="描述你的任务，@ 引用文件，/ 唤起命令"
            className="min-h-[38px] w-full resize-none bg-transparent text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
            rows={1}
          />
        </div>

        {/* 发丝线分隔：输入区与控件区 */}
        <div className="mt-2.5 border-t border-[var(--border-subtle)] pt-2.5">
          <div className="flex items-center gap-1.5">
            {/* 附件按钮 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
              aria-label="添加附件"
            >
              <Paperclip size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.rs,.go,.java,.c,.cpp,.h,.css,.html,.yaml,.yml,.toml,.xml,.sql,.sh,.bat,.png,.jpg,.jpeg,.gif,.webp,.svg"
              onChange={handleAttachmentSelect}
              className="hidden"
            />

            {/* 模式胶囊 */}
            <div className="relative" ref={modeDropdownRef}>
              <button
                onClick={() => { setShowModeDropdown(!showModeDropdown); setShowModelDropdown(false) }}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.04)] px-3 py-[5px] text-xs text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.07)]"
              >
                <activeModeInfo.icon size={11} />
                <span className="font-medium text-[var(--text-primary)]">{activeModeInfo.label}</span>
                <ChevronDown size={9} className="text-[var(--text-tertiary)]" />
              </button>

              {showModeDropdown && (
                <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
                  {BUILTIN_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => { changeMode(mode.id); setShowModeDropdown(false) }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--bg-hover)]',
                        currentMode === mode.id && 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      )}
                    >
                      <mode.icon size={12} />
                      <span>{mode.label}</span>
                    </button>
                  ))}
                  {customModes.length > 0 && (
                    <>
                      <div className="my-1 border-t border-[var(--border-subtle)]" />
                      {customModes.map((mode) => (
                        <button
                          key={mode.slug}
                          onClick={() => { changeMode(mode.slug); setShowModeDropdown(false) }}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--bg-hover)]',
                            currentMode === mode.slug && 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                          )}
                        >
                          <Code size={12} />
                          <span>{mode.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 模型胶囊 */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => { setShowModelDropdown(!showModelDropdown); setShowModeDropdown(false) }}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.04)] px-3 py-[5px] text-xs text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.07)]"
              >
                <Cpu size={11} />
                <span className="max-w-[140px] truncate font-medium text-[var(--text-primary)]">{currentModel || '选择模型'}</span>
                <ChevronDown size={9} className="text-[var(--text-tertiary)]" />
              </button>

              {showModelDropdown && (
                <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg">
                  {/* 搜索框 */}
                  <div className="border-b border-[var(--border-subtle)] p-1.5">
                    <div className="relative">
                      <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input
                        type="text"
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        placeholder={`搜索 ${models.length} 个模型...`}
                        className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] py-1 pl-6 pr-2 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Auto Model 策略 */}
                  <div className="border-b border-[var(--border-subtle)] p-1">
                    <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">智能路由</p>
                    {[
                      { id: 'auto-efficient', icon: Zap, label: 'Auto (高效)' },
                      { id: 'auto-frontier', icon: Brain, label: 'Auto (前沿)' },
                      { id: 'auto-balanced', icon: Sparkles, label: 'Auto (均衡)' },
                    ].map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => { changeModel(strategy.id); setShowModelDropdown(false) }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]',
                          currentModel === strategy.id && 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        )}
                      >
                        <strategy.icon size={12} />
                        <span>{strategy.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 按提供商分组的模型列表 */}
                  <div className="max-h-56 overflow-y-auto p-1">
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider}>
                        <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">
                          {providerNames[provider] || provider}
                          <span className="ml-1 opacity-50">({providerModels.length})</span>
                        </p>
                        {providerModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => { changeModel(model.id); setShowModelDropdown(false) }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-sm px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-hover)]',
                              currentModel === model.id && 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                            )}
                          >
                            <span className="truncate">{model.name}</span>
                            <div className="flex items-center gap-1">
                              {model.supportsImages && (
                                <span className="text-[8px] text-[var(--text-tertiary)]" title="支持图片">🖼</span>
                              )}
                              {model.contextLength && model.contextLength >= 100000 && (
                                <span className="text-[8px] text-[var(--success)]" title="长上下文">∞</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                    {Object.keys(groupedModels).length === 0 && (
                      <p className="px-2 py-2 text-[10px] text-[var(--text-tertiary)]">无匹配模型</p>
                    )}
                  </div>

                  {/* 底部统计 */}
                  <div className="border-t border-[var(--border-subtle)] px-2 py-1 text-[9px] text-[var(--text-tertiary)]">
                    共 {models.length} 个模型 · {providers.length} 个提供商
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：语音 + 发送 */}
            <div className="ml-auto flex items-center gap-1.5">
              {/* @ 引用 */}
              <button
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
                aria-label="引用文件"
              >
                <AtSign size={14} />
              </button>

              {/* 语音输入 */}
              {voiceSupported && (
                <button
                  onClick={toggleListening}
                  className={cn(
                    'flex h-[30px] w-[30px] items-center justify-center rounded-lg transition-colors',
                    isListening
                      ? 'bg-[var(--error-muted)] text-[var(--error)] animate-pulse'
                      : 'text-[var(--text-tertiary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]'
                  )}
                  aria-label={isListening ? '停止语音输入' : '语音输入'}
                >
                  <Mic size={14} />
                </button>
              )}

              {/* 发送/停止按钮 — Codex 风格圆形 */}
              {isStreaming ? (
                <button
                  onClick={cancelGeneration}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--error)] text-white transition-colors"
                  aria-label="停止生成"
                >
                  <Square size={12} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!hasContent}
                  className={cn(
                    'flex h-[30px] w-[30px] items-center justify-center rounded-full transition-all',
                    hasContent
                      ? 'bg-[var(--brand-primary)] text-black shadow-[0_2px_8px_rgba(255,215,0,0.25)]'
                      : 'bg-[rgba(255,255,255,0.08)] text-[var(--text-tertiary)]'
                  )}
                  aria-label="发送"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部提示行 */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[var(--text-tertiary)]">
        <span>KiloCode 可能出错，请核查重要信息</span>
        {usage.total > 0 && (
          <span className="opacity-70">
            本次会话 {formatCost(usage.cost)} · {formatTokenCount(usage.total)} tokens
          </span>
        )}
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

  const builtinCommands = [
    { command: '/code', description: '切换到 Code 模式' },
    { command: '/plan', description: '切换到 Plan 模式' },
    { command: '/ask', description: '切换到 Ask 模式' },
    { command: '/debug', description: '切换到 Debug 模式' },
    { command: '/review', description: '切换到 Review 模式' },
  ]

  const customCommands = customModes.map((mode) => ({
    command: `/${mode.slug}`,
    description: `切换到 ${mode.name} 模式${mode.description ? ` — ${mode.description}` : ''}`,
  }))

  const generalCommands = [
    { command: '/clear', description: '清空当前对话' },
    { command: '/compact', description: '压缩对话上下文' },
    { command: '/fork', description: '分叉当前会话' },
    { command: '/model', description: '切换模型' },
    { command: '/help', description: '显示帮助信息' },
  ]

  return (
    <div className="absolute bottom-full left-6 right-6 z-50 mb-2 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="p-1">
        <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">模式切换</p>
        {builtinCommands.map((cmd) => (
          <button
            key={cmd.command}
            onClick={() => onSelect(cmd.command)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
          >
            <span className="font-mono text-[var(--text-secondary)]">{cmd.command}</span>
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
                <span className="font-mono text-[var(--text-secondary)]">{cmd.command}</span>
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
            <span className="font-mono text-[var(--text-secondary)]">{cmd.command}</span>
            <span className="text-[var(--text-tertiary)]">{cmd.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
