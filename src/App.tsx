import { AppShell } from '@/components/layout/AppShell'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ToastContainer } from '@/components/common/Toast'
import { useTheme } from '@/hooks/useTheme'
import { useKiloConnection } from '@/hooks/useKiloConnection'
import { useConfigStore } from '@/stores/configStore'
import { useMemoryStore } from '@/stores/memoryStore'
import { useRulesStore } from '@/stores/rulesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import { useToastStore } from '@/stores/toastStore'
import { useEffect } from 'react'

/**
 * 应用根组件
 *
 * 初始化主题系统和 CLI 连接，渲染主布局
 * 未连接 CLI 时自动加载模拟数据
 */
function App() {
  // 初始化主题（监听系统偏好变化）
  useTheme()

  // 初始化 CLI 连接（连接成功后自动加载真实数据）
  useKiloConnection()

  // 未连接 CLI 时加载模拟数据（确保 UI 可交互）
  useEffect(() => {
    const { models, providers, customModes, loadModels, loadProviders, loadCustomModes } = useConfigStore.getState()
    if (models.length === 0) loadModels()
    if (providers.length === 0) loadProviders()
    if (customModes.length === 0) loadCustomModes()

    // 加载记忆库模拟数据
    const { loaded, loadEntries } = useMemoryStore.getState()
    if (!loaded) loadEntries()

    // 加载规则模拟数据
    const { loaded: rulesLoaded, loadRules } = useRulesStore.getState()
    if (!rulesLoaded) loadRules()
  }, [])

  // 检测上次会话中断，显示恢复提示
  useEffect(() => {
    const { wasInterrupted, setWasInterrupted } = useSessionStore.getState()
    if (wasInterrupted) {
      useToastStore.getState().addToast({
        type: 'info',
        message: '上次会话中断，已恢复到最近状态',
      })
      setWasInterrupted(false)
    }
  }, [])

  // 注册 IPC 快捷键事件监听
  // 主进程通过 action:xxx 事件发送快捷键指令，渲染进程需注册监听器响应
  useEffect(() => {
    const api = window.api
    if (!api) return

    // Ctrl+J: 切换终端面板
    const handleToggleTerminal = () => {
      const { rightPanelVisible, rightPanelTab, setRightPanelTab, toggleRightPanel } =
        useUiStore.getState()
      if (rightPanelVisible && rightPanelTab === 'terminal') {
        toggleRightPanel()
      } else {
        setRightPanelTab('terminal')
      }
    }

    // Ctrl+B: 切换侧边栏
    const handleToggleSidebar = () => {
      useUiStore.getState().toggleSidebar()
    }

    // Ctrl+N: 新建会话
    const handleNewSession = () => {
      useSessionStore.getState().createNewSession()
    }

    // Ctrl+,: 打开设置
    const handleOpenSettings = () => {
      useUiStore.getState().setSettingsOpen(true)
    }

    api.on('action:toggleTerminal', handleToggleTerminal)
    api.on('action:toggleSidebar', handleToggleSidebar)
    api.on('action:newSession', handleNewSession)
    api.on('action:openSettings', handleOpenSettings)

    return () => {
      api.off('action:toggleTerminal', handleToggleTerminal)
      api.off('action:toggleSidebar', handleToggleSidebar)
      api.off('action:newSession', handleNewSession)
      api.off('action:openSettings', handleOpenSettings)
    }
  }, [])

  return (
    <>
      <AppShell />
      <SettingsPanel />
      <ToastContainer />
    </>
  )
}

export default App
