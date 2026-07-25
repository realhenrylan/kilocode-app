import { useState, useRef, useEffect } from 'react'
import { useBrowserStore } from '@/stores/browserStore'
import { cn } from '@/utils/cn'
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Camera,
  MousePointer2,
  Keyboard,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Code,
  TreePine,
  Loader2,
} from 'lucide-react'

/**
 * 浏览器控制面板
 *
 * KiloCode 内置浏览器控制，支持：
 * - 页面导航（URL 输入、前进/后退/刷新）
 * - 截图预览
 * - 元素交互（点击、输入、选择、悬停）
 * - 无障碍树查看
 * - JavaScript 执行
 * - 滚动控制
 *
 * 与 browserStore 真实对接，未连接 CLI 时使用模拟模式
 */
export function BrowserPanel() {
  const {
    launched,
    currentUrl,
    pageTitle,
    screenshot,
    accessibilityTree,
    isActing,
    error,
    launch,
    close,
    navigate,
    goBack,
    goForward,
    reload,
    click,
    type,
    scroll,
    takeScreenshot,
    evaluate,
    clearError,
  } = useBrowserStore()

  const [urlInput, setUrlInput] = useState(currentUrl)
  const [interactionMode, setInteractionMode] = useState<'click' | 'type' | 'hover'>('click')
  const [selectorInput, setSelectorInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [jsExpression, setJsExpression] = useState('')
  const [jsResult, setJsResult] = useState<string | null>(null)
  const [showA11yTree, setShowA11yTree] = useState(false)
  const [showJsConsole, setShowJsConsole] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // 同步 URL 输入框
  useEffect(() => {
    setUrlInput(currentUrl)
  }, [currentUrl])

  /** 导航提交 */
  const handleNavigate = () => {
    const url = urlInput.trim()
    if (!url) return
    navigate(url)
  }

  /** URL 输入回车 */
  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNavigate()
    }
  }

  /** 执行元素交互 */
  const handleInteract = async () => {
    if (!selectorInput.trim()) return

    switch (interactionMode) {
      case 'click':
        await click(selectorInput)
        break
      case 'type':
        await type(selectorInput, textInput)
        break
      case 'hover':
        await useBrowserStore.getState().hover(selectorInput)
        break
    }
  }

  /** 执行 JS */
  const handleEvaluate = async () => {
    if (!jsExpression.trim()) return
    const result = await evaluate(jsExpression)
    setJsResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
  }

  // 未启动浏览器时显示启动界面
  if (!launched) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-muted)]">
          <Globe size={24} className="text-[var(--brand-primary)]" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">浏览器控制</h3>
        <p className="mb-4 text-center text-xs text-[var(--text-tertiary)]">
          启动内置浏览器，AI 可以浏览网页、<br />填写表单、截图分析
        </p>
        <button
          onClick={launch}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-[var(--brand-hover)]"
        >
          <Globe size={14} />
          启动浏览器
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* ===== 工具栏 ===== */}
      <div className="border-b border-[var(--border-subtle)] px-2 py-1.5">
        {/* 导航栏 */}
        <div className="flex items-center gap-1">
          {/* 前进/后退/刷新 */}
          <button
            onClick={goBack}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
            title="后退"
          >
            <ArrowLeft size={12} />
          </button>
          <button
            onClick={goForward}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
            title="前进"
          >
            <ArrowRight size={12} />
          </button>
          <button
            onClick={reload}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
            title="刷新"
          >
            <RotateCw size={12} className={isActing ? 'animate-spin' : ''} />
          </button>

          {/* URL 输入 */}
          <div className="flex flex-1 items-center rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2">
            <Globe size={10} className="mr-1.5 flex-shrink-0 text-[var(--text-tertiary)]" />
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="输入 URL..."
              className="flex-1 bg-transparent py-1 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
            />
          </div>

          {/* 截图按钮 */}
          <button
            onClick={takeScreenshot}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--brand-primary)] disabled:opacity-30"
            title="截图"
          >
            <Camera size={12} />
          </button>

          {/* 关闭浏览器 */}
          <button
            onClick={close}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--error)]"
            title="关闭浏览器"
          >
            <X size={12} />
          </button>
        </div>

        {/* 页面标题 */}
        {pageTitle && (
          <div className="mt-1 truncate px-1 text-[10px] text-[var(--text-tertiary)]">
            {pageTitle}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-1 flex items-center gap-1 rounded bg-[var(--error-muted)] px-2 py-1 text-[10px] text-[var(--error)]">
            <span className="flex-1 truncate">{error}</span>
            <button onClick={clearError} className="flex-shrink-0 hover:opacity-70">
              <X size={10} />
            </button>
          </div>
        )}
      </div>

      {/* ===== 截图预览区 ===== */}
      <div className="relative flex-1 overflow-hidden bg-[var(--bg-tertiary)]">
        {isActing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-tertiary)]/60">
            <Loader2 size={20} className="animate-spin text-[var(--brand-primary)]" />
          </div>
        )}
        {screenshot ? (
          <img
            src={screenshot}
            alt="页面截图"
            className="h-full w-full object-contain object-top"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-tertiary)]">
            <Camera size={32} className="mb-2 opacity-20" />
            <p className="text-xs">点击 📷 截图按钮获取页面预览</p>
          </div>
        )}
      </div>

      {/* ===== 交互工具栏 ===== */}
      <div className="border-t border-[var(--border-subtle)] px-2 py-1.5">
        {/* 交互模式选择 */}
        <div className="flex items-center gap-1">
          {/* 模式切换按钮组 */}
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)]">
            {([
              { mode: 'click' as const, icon: MousePointer2, label: '点击' },
              { mode: 'type' as const, icon: Keyboard, label: '输入' },
              { mode: 'hover' as const, icon: MousePointer2, label: '悬停' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setInteractionMode(mode)}
                className={cn(
                  'flex items-center gap-0.5 px-2 py-1 text-[10px] transition-colors',
                  interactionMode === mode
                    ? 'bg-[var(--brand-primary)] text-black'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
                title={label}
              >
                <Icon size={10} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* 滚动按钮 */}
          <button
            onClick={() => scroll('up')}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
            title="向上滚动"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => scroll('down')}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
            title="向下滚动"
          >
            <ChevronDown size={12} />
          </button>

          {/* 无障碍树切换 */}
          <button
            onClick={() => setShowA11yTree(!showA11yTree)}
            className={cn(
              'flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] transition-colors',
              showA11yTree
                ? 'bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            )}
            title="无障碍树"
          >
            <TreePine size={10} />
          </button>

          {/* JS 控制台切换 */}
          <button
            onClick={() => setShowJsConsole(!showJsConsole)}
            className={cn(
              'flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] transition-colors',
              showJsConsole
                ? 'bg-[var(--brand-muted)] text-[var(--brand-primary)]'
                : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            )}
            title="JS 控制台"
          >
            <Code size={10} />
          </button>
        </div>

        {/* 选择器 +选择器输入行 */}
        <div className="mt-1.5 flex items-center gap-1">
          <input
            type="text"
            value={selectorInput}
            onChange={(e) => setSelectorInput(e.target.value)}
            placeholder="CSS 选择器 (如 #search, .btn-primary)"
            className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
          />
          {interactionMode === 'type' && (
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="输入文本"
              className="w-24 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--input-focus-border)] focus:outline-none"
            />
          )}
          <button
            onClick={handleInteract}
            disabled={isActing || !selectorInput.trim()}
            className={cn(
              'flex h-6 items-center justify-center rounded-md px-2 transition-colors',
              selectorInput.trim() && !isActing
                ? 'bg-[var(--brand-primary)] text-black hover:bg-[var(--brand-hover)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
            )}
          >
            <Play size={10} />
          </button>
        </div>

        {/* JS 控制台 */}
        {showJsConsole && (
          <div className="mt-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] p-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--brand-primary)]">&gt;</span>
              <input
                type="text"
                value={jsExpression}
                onChange={(e) => setJsExpression(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEvaluate()}
                placeholder="document.title"
                className="flex-1 bg-transparent text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
              <button
                onClick={handleEvaluate}
                className="text-[10px] text-[var(--brand-primary)] hover:text-[var(--brand-hover)]"
              >
                运行
              </button>
            </div>
            {jsResult !== null && (
              <pre className="mt-1 max-h-20 overflow-auto rounded bg-[var(--bg-primary)] p-1 text-[9px] text-[var(--text-secondary)]">
                {jsResult}
              </pre>
            )}
          </div>
        )}

        {/* 无障碍树 */}
        {showA11yTree && accessibilityTree && (
          <div className="mt-1.5 max-h-32 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] p-1.5">
            <pre className="whitespace-pre-wrap text-[9px] text-[var(--text-secondary)]">
              {accessibilityTree}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
