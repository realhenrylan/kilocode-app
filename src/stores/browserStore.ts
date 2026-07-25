import { create } from 'zustand'
import type { BrowserState, BrowserAction, BrowserSnapshot } from '@/types/kilo'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * 浏览器控制状态管理
 *
 * 管理 KiloCode 内置浏览器的启动、导航、截图、元素交互等
 * 与 kiloClient browser API 真实对接
 * 未连接 CLI 时提供模拟模式用于开发/演示
 */

interface BrowserStoreState extends BrowserState {
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

/** 模拟页面数据（未连接 CLI 时的演示模式） */
const MOCK_PAGES: Record<string, { title: string; tree: string; screenshot: string }> = {
  'about:blank': {
    title: '空白页',
    tree: '[document] 空白页\n  [body]',
    screenshot: '',
  },
  'https://example.com': {
    title: 'Example Domain',
    tree: '[document] Example Domain\n  [heading "Example Domain"]\n  [paragraph "This domain is for use in illustrative examples..."]\n  [link "More information..." url="https://www.iana.org/domains/example"]',
    screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  },
  'https://github.com': {
    title: 'GitHub: Let\'s build from here',
    tree: '[document] GitHub\n  [navigation]\n    [link "GitHub"]\n    [search "Search or jump to..."]\n    [link "Pull requests"]\n    [link "Issues"]\n  [main]\n    [heading "Let\'s build from here"]\n    [paragraph "The world\'s leading AI-powered developer platform"]\n    [textbox "Email address"]\n    [button "Sign up for GitHub"]',
    screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  },
}

export const useBrowserStore = create<BrowserStoreState>()((set, get) => ({
  ...initialState,

  launch: async () => {
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    set({ isActing: true, error: null })

    if (connected && sessionId) {
      try {
        await kiloApi.launchBrowser(sessionId)
        // 启动后获取初始快照
        const snapshot = await kiloApi.browserSnapshot(sessionId)
        set({
          launched: true,
          currentUrl: snapshot.url,
          pageTitle: snapshot.title,
          accessibilityTree: snapshot.accessibilityTree,
          screenshot: snapshot.screenshot || null,
          history: [snapshot.url],
          historyIndex: 0,
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.launch] API failed:', err)
        // 降级到模拟模式
      }
    }

    // 模拟模式
    await new Promise((r) => setTimeout(r, 500))
    set({
      launched: true,
      currentUrl: 'about:blank',
      pageTitle: '空白页',
      accessibilityTree: MOCK_PAGES['about:blank'].tree,
      screenshot: null,
      history: ['about:blank'],
      historyIndex: 0,
      isActing: false,
    })
  },

  close: async () => {
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        await kiloApi.closeBrowser(sessionId)
      } catch (err) {
        console.error('[browserStore.close] API failed:', err)
      }
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

    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
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

    // 模拟模式
    await new Promise((r) => setTimeout(r, 800))
    const mockPage = MOCK_PAGES[normalizedUrl] || {
      title: normalizedUrl.replace(/^https?:\/\//, '').split('/')[0],
      tree: `[document] ${normalizedUrl}\n  [heading "${normalizedUrl}"]\n  [paragraph "页面内容加载中..."]`,
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), normalizedUrl]
    set({
      currentUrl: normalizedUrl,
      pageTitle: mockPage.title,
      accessibilityTree: mockPage.tree,
      screenshot: mockPage.screenshot,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isActing: false,
    })
  },

  goBack: async () => {
    const { historyIndex, history } = get()
    if (historyIndex <= 0) return

    const prevUrl = history[historyIndex - 1]
    set({ historyIndex: historyIndex - 1 })
    await get().navigate(prevUrl)
    // 恢复 historyIndex（navigate 会推入新记录，但 goBack 应该只是移动指针）
    set({ historyIndex: historyIndex - 1 })
  },

  goForward: async () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return

    const nextUrl = history[historyIndex + 1]
    set({ historyIndex: historyIndex + 1 })
    await get().navigate(nextUrl)
    set({ historyIndex: historyIndex + 1 })
  },

  reload: async () => {
    const { currentUrl } = get()
    if (!currentUrl) return
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
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
        const result = await kiloApi.browserAction(sessionId, {
          type: 'evaluate',
          expression,
        })
        return result.result
      } catch (err) {
        console.error('[browserStore.evaluate] Failed:', err)
        return undefined
      }
    }

    // 模拟模式
    return `// 执行结果: ${expression}`
  },

  takeScreenshot: async () => {
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId
    const state = get()
    if (!state.launched) return

    set({ isActing: true })

    if (connected && sessionId) {
      try {
        const snapshot = await kiloApi.browserSnapshot(sessionId, true)
        set({
          screenshot: snapshot.screenshot || null,
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.takeScreenshot] Failed:', err)
      }
    }

    // 模拟截图
    await new Promise((r) => setTimeout(r, 300))
    set({
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      isActing: false,
    })
  },

  getSnapshot: async () => {
    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId
    const state = get()
    if (!state.launched) return

    set({ isActing: true })

    if (connected && sessionId) {
      try {
        const snapshot = await kiloApi.browserSnapshot(sessionId, false)
        set({
          currentUrl: snapshot.url,
          pageTitle: snapshot.title,
          accessibilityTree: snapshot.accessibilityTree,
          isActing: false,
        })
        return
      } catch (err) {
        console.error('[browserStore.getSnapshot] Failed:', err)
      }
    }

    set({ isActing: false })
  },

  executeAction: async (action: BrowserAction) => {
    const state = get()
    if (!state.launched) return

    set({ isActing: true, error: null })

    const connected = useConnectionStore.getState().connected
    const sessionId = useSessionStore.getState().activeSessionId

    if (connected && sessionId) {
      try {
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

    // 模拟模式：短暂延迟后更新快照
    await new Promise((r) => setTimeout(r, 400))
    set({ isActing: false })
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}))
