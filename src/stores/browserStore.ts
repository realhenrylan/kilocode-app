import { create } from 'zustand'
import type { BrowserState, BrowserAction, BrowserSnapshot } from '@/types/kilo'
import { useConnectionStore } from '@/stores/connectionStore'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * 浏览器控制状态管理
 *
 * 管理 KiloCode 内置浏览器的启动、导航、截图等
 * 使用 <webview> 标签嵌入真实浏览器，同时保留 kiloApi CLI 后端作为可选
 */

/** webview 标签引用类型（Electron WebviewTag） */
type WebviewTag = Electron.WebviewTag

interface BrowserStoreState extends BrowserState {
  // Additional state
  /** webview 实例引用，供面板组件外使用 */
  webviewRef: WebviewTag | null

  // Actions
  /** 启动浏览器 */
  launch: () => Promise<void>
  /** 关闭浏览器 */
  close: () => Promise<void>
  /** 导航到 URL */
  navigate: (url: string) => Promise<void>
  /** 后退 */
  goBack: () => Promise<void>
  /** 前进 */
  goForward: () => Promise<void>
  /** 刷新页面 */
  reload: () => Promise<void>
  /** 点击元素 */
  click: (selector: string) => Promise<void>
  /** 输入文本 */
  type: (selector: string, text: string) => Promise<void>
  /** 选择下拉选项 */
  select: (selector: string, value: string) => Promise<void>
  /** 悬停元素 */
  hover: (selector: string) => Promise<void>
  /** 滚动页面 */
  scroll: (direction: 'up' | 'down' | 'left' | 'right', amount?: number) => Promise<void>
  /** 执行 JavaScript */
  evaluate: (expression: string) => Promise<unknown>
  /** 截图 */
  takeScreenshot: () => Promise<void>
  /** 获取页面快照（无障碍树） */
  getSnapshot: () => Promise<void>
  /** 执行通用浏览器操作 */
  executeAction: (action: BrowserAction) => Promise<void>
  /** 设置 webview 引用 */
  setWebviewRef: (ref: WebviewTag | null) => void
  /** 清除错误 */
  clearError: () => void
  /** 重置状态 */
  reset: () => void
}

const initialState: BrowserState = {
  launched: false,
  currentUrl: '',
  pageTitle: '',
  screenshot: null,
  accessibilityTree: null,
  history: [],
  historyIndex: -1,
  isActing: false,
  error: null,
}

export const useBrowserStore = create<BrowserStoreState>()((set, get) => ({
  ...initialState,
  webviewRef: null,

  setWebviewRef: (ref: WebviewTag | null) => {
    set({ webviewRef: ref })
  },

  launch: async () => {
    // webview 模式：直接设置 launched 状态
    // 实际的 webview 在 BrowserPanel 中渲染
    set({
      launched: true,
      currentUrl: 'about:blank',
      pageTitle: '空白页',
      accessibilityTree: null,
      screenshot: null,
      history: ['about:blank'],
      historyIndex: 0,
      isActing: false,
      error: null,
    })
  },

  close: async () => {
    const { webviewRef } = get()
    if (webviewRef) {
      // 清除 webview 引用
      set({ webviewRef: null })
    }
    set(initialState)
  },

  navigate: async (url: string) => {
    const state = get()
    if (!state.launched) return

    // 确保 URL 有协议前缀
    let normalizedUrl = url
    if (!/^https?:\/\//i.test(url) && url !== 'about:blank') {
      normalizedUrl = `https://${url}`
    }

    set({ isActing: true, error: null })

    // 优先使用 webview 直接导航
    if (state.webviewRef) {
      try {
        state.webviewRef.loadURL(normalizedUrl)
        // URL 更新由 webview 的 did-navigate 事件处理
        const newHistory = [...state.history.slice(0, state.historyIndex + 1), normalizedUrl]
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })
        return
      } catch (err) {
        console.error('[browserStore.navigate] webview loadURL failed:', err)
      }
    }

    // 降级：使用 CLI API
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        const { kiloApi } = await import('@/services/kiloClient')
        const result = await kiloApi.browserAction(sessionId, {
          type: 'navigate',
          url: normalizedUrl,
        })
        if (result.success && result.snapshot) {
          const newHistory = [...state.history.slice(0, state.historyIndex + 1), normalizedUrl]
          set({
            currentUrl: result.snapshot.url,
            pageTitle: result.snapshot.title,
            accessibilityTree: result.snapshot.accessibilityTree,
            screenshot: result.snapshot.screenshot || state.screenshot,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isActing: false,
          })
          return
        }
        set({ isActing: false, error: result.error || '导航失败' })
        return
      } catch (err) {
        console.error('[browserStore.navigate] API failed:', err)
      }
    }

    // 最终降级：只更新 URL 状态
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), normalizedUrl]
    set({
      currentUrl: normalizedUrl,
      pageTitle: normalizedUrl.replace(/^https?:\/\//, '').split('/')[0],
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isActing: false,
    })
  },

  goBack: async () => {
    const { historyIndex, history, webviewRef } = get()
    if (historyIndex <= 0) return

    const prevUrl = history[historyIndex - 1]
    set({ historyIndex: historyIndex - 1 })

    if (webviewRef && webviewRef.canGoBack()) {
      webviewRef.goBack()
    } else {
      await get().navigate(prevUrl)
      set({ historyIndex: historyIndex - 1 })
    }
  },

  goForward: async () => {
    const { historyIndex, history, webviewRef } = get()
    if (historyIndex >= history.length - 1) return

    const nextUrl = history[historyIndex + 1]
    set({ historyIndex: historyIndex + 1 })

    if (webviewRef && webviewRef.canGoForward()) {
      webviewRef.goForward()
    } else {
      await get().navigate(nextUrl)
      set({ historyIndex: historyIndex + 1 })
    }
  },

  reload: async () => {
    const { currentUrl, webviewRef } = get()
    if (!currentUrl) return

    if (webviewRef) {
      set({ isActing: true })
      webviewRef.reload()
      return
    }

    await get().navigate(currentUrl)
  },

  click: async (selector: string) => {
    await get().executeAction({ type: 'click', selector })
  },

  type: async (selector: string, text: string) => {
    await get().executeAction({ type: 'type', selector, text })
  },

  select: async (selector: string, value: string) => {
    await get().executeAction({ type: 'select', selector, optionValue: value })
  },

  hover: async (selector: string) => {
    await get().executeAction({ type: 'hover', selector })
  },

  scroll: async (direction: 'up' | 'down' | 'left' | 'right', amount = 300) => {
    await get().executeAction({ type: 'scroll', scrollDirection: direction, scrollAmount: amount })
  },

  evaluate: async (expression: string) => {
    const { webviewRef } = get()

    // 优先使用 webview 执行 JS
    if (webviewRef) {
      try {
        return await webviewRef.executeJavaScript(expression)
      } catch (err) {
        console.error('[browserStore.evaluate] webview failed:', err)
        return undefined
      }
    }

    // 降级：使用 CLI API
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        const { kiloApi } = await import('@/services/kiloClient')
        const result = await kiloApi.browserAction(sessionId, {
          type: 'evaluate',
          expression,
        })
        return result.result
      } catch (err) {
        console.error('[browserStore.evaluate] API failed:', err)
        return undefined
      }
    }

    return undefined
  },

  takeScreenshot: async () => {
    const { webviewRef } = get()
    const state = get()
    if (!state.launched) return

    set({ isActing: true })

    // 优先使用 webview 截图
    if (webviewRef) {
      try {
        const image = await webviewRef.capturePage()
        const dataUrl = image.toDataURL()
        set({
          screenshot: dataUrl,
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.takeScreenshot] webview capturePage failed:', err)
      }
    }

    // 降级：使用 CLI API
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        const { kiloApi } = await import('@/services/kiloClient')
        const snapshot = await kiloApi.browserSnapshot(sessionId, true)
        set({
          screenshot: snapshot.screenshot || null,
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.takeScreenshot] API failed:', err)
      }
    }

    set({ isActing: false })
  },

  getSnapshot: async () => {
    const { webviewRef } = get()
    const state = get()
    if (!state.launched) return

    set({ isActing: true })

    // 优先使用 webview 获取 DOM 快照
    if (webviewRef) {
      try {
        const tree = await webviewRef.executeJavaScript(`
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
        set({
          accessibilityTree: tree,
          currentUrl: webviewRef.getURL(),
          pageTitle: webviewRef.getTitle(),
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.getSnapshot] webview failed:', err)
      }
    }

    // 降级：使用 CLI API
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        const { kiloApi } = await import('@/services/kiloClient')
        const snapshot = await kiloApi.browserSnapshot(sessionId, false)
        set({
          currentUrl: snapshot.url,
          pageTitle: snapshot.title,
          accessibilityTree: snapshot.accessibilityTree,
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.getSnapshot] API failed:', err)
      }
    }

    set({ isActing: false })
  },

  executeAction: async (action: BrowserAction) => {
    const state = get()
    if (!state.launched) return

    set({ isActing: true, error: null })

    // 优先使用 webview 执行操作
    if (state.webviewRef) {
      try {
        const escapedSelector = action.selector?.replace(/'/g, "\\'") || ''

        switch (action.type) {
          case 'click':
            await state.webviewRef.executeJavaScript(
              `document.querySelector('${escapedSelector}')?.click()`
            )
            break
          case 'type':
            await state.webviewRef.executeJavaScript(
              `const el = document.querySelector('${escapedSelector}'); if(el) { el.focus(); el.value = '${action.text?.replace(/'/g, "\\'")}'; el.dispatchEvent(new Event('input', {bubbles:true})); }`
            )
            break
          case 'hover':
            await state.webviewRef.executeJavaScript(
              `const el = document.querySelector('${escapedSelector}'); if(el) { el.dispatchEvent(new MouseEvent('mouseover', {bubbles:true})); }`
            )
            break
          case 'scroll': {
            const amount = action.scrollDirection === 'up' ? '-300'
              : action.scrollDirection === 'down' ? '300'
              : '0'
            await state.webviewRef.executeJavaScript(
              `window.scrollBy({ top: ${amount}, behavior: 'smooth' })`
            )
            break
          }
          case 'navigate':
            if (action.url) {
              state.webviewRef.loadURL(action.url)
            }
            break
          case 'goBack':
            if (state.webviewRef.canGoBack()) state.webviewRef.goBack()
            break
          case 'goForward':
            if (state.webviewRef.canGoForward()) state.webviewRef.goForward()
            break
          case 'reload':
            state.webviewRef.reload()
            break
          case 'evaluate':
            if (action.expression) {
              await state.webviewRef.executeJavaScript(action.expression)
            }
            break
        }
        set({ isActing: false })
        return
      } catch (err) {
        console.error('[browserStore.executeAction] webview failed:', err)
        // 不立即降级，因为某些操作可能需要页面完全加载
      }
    }

    // 降级：使用 CLI API
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        const { kiloApi } = await import('@/services/kiloClient')
        const result = await kiloApi.browserAction(sessionId, action)
        if (result.success) {
          if (result.snapshot) {
            set({
              currentUrl: result.snapshot.url || state.currentUrl,
              pageTitle: result.snapshot.title || state.pageTitle,
              accessibilityTree: result.snapshot.accessibilityTree || state.accessibilityTree,
              screenshot: result.snapshot.screenshot || state.screenshot,
            })
          }
          set({ isActing: false })
          return
        }
        set({ isActing: false, error: result.error || '操作失败' })
        return
      } catch (err) {
        console.error('[browserStore.executeAction] API failed:', err)
      }
    }

    // 最终降级：短暂延迟后更新快照
    await new Promise((r) => setTimeout(r, 400))
    set({ isActing: false })
  },

  clearError: () => set({ error: null }),

  reset: () => set({ ...initialState, webviewRef: null }),
}))
