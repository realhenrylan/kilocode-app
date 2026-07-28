import { useState, useRef, useEffect, useCallback } from 'react'
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
 * 使用 Electron <webview> 标签嵌入真实浏览器，
 * 支持完整的页面交互（点击、输入、滚动等）。
 * webview 运行在独立进程中，不受 X-Frame-Options 限制。
 */
export function BrowserPanel() {
  const {
    launched,
    currentUrl,
    pageTitle,
    screenshot,
    isActing,
    error,
    launch,
    close,
    clearError,
    setWebviewRef,
  } = useBrowserStore()

  const [urlInput, setUrlInput] = useState(currentUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [interactionMode, setInteractionMode] = useState<'click' | 'type' | 'hover'>('click')
  const [selectorInput, setSelectorInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [jsExpression, setJsExpression] = useState('')
  const [jsResult, setJsResult] = useState<string | null>(null)
  const [showA11yTree, setShowA11yTree] = useState(false)
  const [showJsConsole, setShowJsConsole] = useState(false)
  /** 初始 URL，只在 webview 首次挂载时使用，后续导航通过 loadURL */
  const [initialUrl] = useState(currentUrl || 'about:blank')
  const urlInputRef = useRef<HTMLInputElement>(null)
  const webviewRef = useRef<Electron.WebviewTag | null>(null)

  // 同步 URL 输入框
  useEffect(() => {
    setUrlInput(currentUrl)
  }, [currentUrl])

  /**
   * 注册 webview 事件监听
   *
   * 监听导航、标题变化、加载状态等事件，
   * 同步更新 browserStore 状态
   */
  const registerWebviewEvents = useCallback((webview: Electron.WebviewTag) => {
    const store = useBrowserStore.getState()

    // 导航完成 — 更新 URL 和历史
    webview.addEventListener('did-navigate', (event: Electron.DidNavigateEvent) => {
      const state = useBrowserStore.getState()
      const newHistory = [...state.history.slice(0, state.historyIndex + 1), event.url]
      useBrowserStore.setState({
        currentUrl: event.url,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isActing: false,
      })
    })

    // 页内导航（hash 变化等）
    webview.addEventListener('did-navigate-in-page', (event: Electron.DidNavigateInPageEvent) => {
      if (!event.isMainFrame) return
      useBrowserStore.setState({ currentUrl: event.url })
    })

    // 标题更新
    webview.addEventListener('page-title-updated', (event: Electron.PageTitleUpdatedEvent) => {
      useBrowserStore.setState({ pageTitle: event.title })
    })

    // 加载开始
    webview.addEventListener('did-start-loading', () => {
      setIsLoading(true)
    })

    // 加载完成
    webview.addEventListener('did-stop-loading', () => {
      setIsLoading(false)
      useBrowserStore.setState({ isActing: false })
    })

    // 加载失败
    webview.addEventListener('did-fail-load', (event: Electron.DidFailLoadEvent) => {
      if (event.errorCode === -3) return // 忽略用户取消
      useBrowserStore.setState({
        isActing: false,
        error: `加载失败: ${event.errorDescription} (${event.errorCode})`,
      })
      setIsLoading(false)
    })

    // 新窗口请求 — 阻止 webview 内的弹窗
    // 注意：new-window 事件在现代 Electron 中已移除，
    // webview 的 sandbox 属性已控制弹窗行为

    // 存储引用到 store，供其他组件使用
    setWebviewRef(webview)
  }, [setWebviewRef])

  /**
   * webview DOM 就绪回调
   *
   * webview 标签挂载后注册所有事件监听
   * 注意：HTMLWebViewElement 是 DOM 元素类型，需要转换为 Electron.WebviewTag
   * 才能访问 webview 特有的 API（loadURL、executeJavaScript 等）
   */
  const handleWebviewMount = useCallback((node: HTMLWebViewElement | null) => {
    if (!node) return
    // webview 元素在运行时具有 Electron.WebviewTag 的所有方法
    const webview = node as unknown as Electron.WebviewTag
    webviewRef.current = webview
    registerWebviewEvents(webview)
  }, [registerWebviewEvents])

  /** 导航提交 */
  const handleNavigate = () => {
    const url = urlInput.trim()
    if (!url) return

    // 确保 URL 有协议前缀
    let normalizedUrl = url
    if (!/^https?:\/\//i.test(url) && url !== 'about:blank') {
      normalizedUrl = `https://${url}`
    }

    useBrowserStore.setState({ isActing: true, error: null, currentUrl: normalizedUrl })

    if (webviewRef.current) {
      webviewRef.current.loadURL(normalizedUrl)
    }
  }

  /** URL 输入回车 */
  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNavigate()
    }
  }

  /** 后退 */
  const handleGoBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      useBrowserStore.setState({ isActing: true })
      webviewRef.current.goBack()
    }
  }

  /** 前进 */
  const handleGoForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      useBrowserStore.setState({ isActing: true })
      webviewRef.current.goForward()
    }
  }

  /** 刷新 */
  const handleReload = () => {
    if (webviewRef.current) {
      useBrowserStore.setState({ isActing: true })
      webviewRef.current.reload()
    }
  }

  /** 截图 — 使用 webview 的 capturePage API */
  const handleTakeScreenshot = async () => {
    if (!webviewRef.current) return

    try {
      const image = await webviewRef.current.capturePage()
      const dataUrl = image.toDataURL()
      useBrowserStore.setState({ screenshot: dataUrl })
    } catch (err) {
      console.error('[BrowserPanel] capturePage failed:', err)
    }
  }

  /** 执行元素交互 */
  const handleInteract = async () => {
    if (!selectorInput.trim() || !webviewRef.current) return

    try {
      switch (interactionMode) {
        case 'click':
          await webviewRef.current.executeJavaScript(
            `document.querySelector('${selectorInput.replace(/'/g, "\\'")}')?.click()`
          )
          break
        case 'type':
          await webviewRef.current.executeJavaScript(
            `const el = document.querySelector('${selectorInput.replace(/'/g, "\\'")}'); if(el) { el.focus(); el.value = '${textInput.replace(/'/g, "\\'")}'; el.dispatchEvent(new Event('input', {bubbles:true})); }`
          )
          break
        case 'hover':
          await webviewRef.current.executeJavaScript(
            `const el = document.querySelector('${selectorInput.replace(/'/g, "\\'")}'); if(el) { el.dispatchEvent(new MouseEvent('mouseover', {bubbles:true})); }`
          )
          break
      }
    } catch (err) {
      console.error('[BrowserPanel] interact failed:', err)
      useBrowserStore.setState({ error: `交互失败: ${err}` })
    }
  }

  /** 滚动 */
  const handleScroll = async (direction: 'up' | 'down') => {
    if (!webviewRef.current) return
    const amount = direction === 'up' ? '-300' : '300'
    try {
      await webviewRef.current.executeJavaScript(
        `window.scrollBy({ top: ${amount}, behavior: 'smooth' })`
      )
    } catch (err) {
      console.error('[BrowserPanel] scroll failed:', err)
    }
  }

  /** 执行 JS */
  const handleEvaluate = async () => {
    if (!jsExpression.trim() || !webviewRef.current) return
    try {
      const result = await webviewRef.current.executeJavaScript(jsExpression)
      setJsResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
    } catch (err) {
      setJsResult(`错误: ${err}`)
    }
  }

  /** 获取无障碍树（通过 JS 执行简单 DOM 遍历） */
  const handleGetA11yTree = async () => {
    if (!webviewRef.current) return
    try {
      const tree = await webviewRef.current.executeJavaScript(`
        (function getA11yTree(el, indent) {
          indent = indent || 0;
          const tag = el.tagName?.toLowerCase() || '#text';
          const role = el.getAttribute?.('role') || '';
          const aria = el.getAttribute?.('aria-label') || '';
          const text = (el.textContent || '').trim().slice(0, 50);
          let line = '  '.repeat(indent) + '[' + tag;
          if (role) line += ' role=' + role;
          if (aria) line += ' aria-label=' + aria;
          if (text && el.children?.length === 0) line += ' "' + text + '"';
          line += ']';
          let result = line + '\\n';
          if (el.children) {
            for (const child of el.children) {
              result += getA11yTree(child, indent + 1);
            }
          }
          return result;
        })(document.body)
      `)
      useBrowserStore.setState({ accessibilityTree: tree })
    } catch (err) {
      console.error('[BrowserPanel] getA11yTree failed:', err)
    }
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
            onClick={handleGoBack}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
            title="后退"
          >
            <ArrowLeft size={12} />
          </button>
          <button
            onClick={handleGoForward}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
            title="前进"
          >
            <ArrowRight size={12} />
          </button>
          <button
            onClick={handleReload}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
            title="刷新"
          >
            <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* URL 输入 */}
          <div className="flex flex-1 items-center rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2">
            <Globe size={10} className="mr-1.5 flex-shrink-0 text-[var(--text-tertiary)]" />
            {isLoading && (
              <Loader2 size={10} className="mr-1 flex-shrink-0 animate-spin text-[var(--brand-primary)]" />
            )}
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
            onClick={handleTakeScreenshot}
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

      {/* ===== webview 浏览器区域 ===== */}
      {/* 使用 relative + absolute 定位确保 webview 填满容器 */}
      <div className="relative min-h-0 flex-1 bg-white">
        {isActing && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-tertiary)]/60">
            <Loader2 size={20} className="animate-spin text-[var(--brand-primary)]" />
          </div>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <webview
          ref={handleWebviewMount}
          src={initialUrl}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          {...({ sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads' } as any)}
        />
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
            onClick={() => handleScroll('up')}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
            title="向上滚动"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => handleScroll('down')}
            disabled={isActing}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
            title="向下滚动"
          >
            <ChevronDown size={12} />
          </button>

          {/* 无障碍树切换 */}
          <button
            onClick={() => {
              if (!showA11yTree) handleGetA11yTree()
              setShowA11yTree(!showA11yTree)
            }}
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

        {/* 选择器 + 输入行 */}
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
        {showA11yTree && useBrowserStore.getState().accessibilityTree && (
          <div className="mt-1.5 max-h-32 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] p-1.5">
            <pre className="whitespace-pre-wrap text-[9px] text-[var(--text-secondary)]">
              {useBrowserStore.getState().accessibilityTree}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
