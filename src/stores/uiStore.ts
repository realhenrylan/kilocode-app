import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '@/types/kilo'

/**
 * UI 状态管理
 *
 * 管理主题、面板可见性、布局等 UI 相关状态
 * 持久化到 localStorage
 */
interface UiState {
  /** 当前主题模式 */
  theme: ThemeMode
  /** 解析后的实际主题（dark/light，system 模式下根据系统偏好解析） */
  resolvedTheme: 'dark' | 'light'
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean
  /** 右侧面板是否可见 */
  rightPanelVisible: boolean
  /** 右侧面板活动标签 */
  rightPanelTab: 'terminal' | 'diff' | 'files' | 'browser'
  /** 设置面板是否打开 */
  settingsOpen: boolean
  /** Composer 是否聚焦 */
  composerFocused: boolean
  /** 编辑器/代码区域字体 */
  editorFont: string
  /** 编辑器字号（px） */
  editorFontSize: number
  /** 是否启用连字 */
  ligaturesEnabled: boolean
  /** 界面信息密度 */
  density: 'comfortable' | 'compact'

  // Actions
  setTheme: (theme: ThemeMode) => void
  setResolvedTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: 'terminal' | 'diff' | 'files' | 'browser') => void
  setSettingsOpen: (open: boolean) => void
  setComposerFocused: (focused: boolean) => void
  setEditorFont: (font: string) => void
  setEditorFontSize: (size: number) => void
  setLigaturesEnabled: (enabled: boolean) => void
  setDensity: (density: 'comfortable' | 'compact') => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      sidebarCollapsed: false,
      rightPanelVisible: false,
      rightPanelTab: 'terminal',
      settingsOpen: false,
      composerFocused: false,
      editorFont: 'JetBrains Mono',
      editorFontSize: 12,
      ligaturesEnabled: true,
      density: 'comfortable',

      setTheme: (theme) => set({ theme }),
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleRightPanel: () => set((s) => ({ rightPanelVisible: !s.rightPanelVisible })),
      setRightPanelTab: (tab) => set({ rightPanelVisible: true, rightPanelTab: tab }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setComposerFocused: (focused) => set({ composerFocused: focused }),
      setEditorFont: (editorFont) => set({ editorFont }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      setLigaturesEnabled: (ligaturesEnabled) => set({ ligaturesEnabled }),
      setDensity: (density) => set({ density }),
    }),
    {
      name: 'kilocode-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelVisible: state.rightPanelVisible,
        rightPanelTab: state.rightPanelTab,
        editorFont: state.editorFont,
        editorFontSize: state.editorFontSize,
        ligaturesEnabled: state.ligaturesEnabled,
        density: state.density,
      }),
    }
  )
)
