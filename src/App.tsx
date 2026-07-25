import { AppShell } from '@/components/layout/AppShell'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { useTheme } from '@/hooks/useTheme'
import { useKiloConnection } from '@/hooks/useKiloConnection'
import { useConfigStore } from '@/stores/configStore'
import { useMemoryStore } from '@/stores/memoryStore'
import { useRulesStore } from '@/stores/rulesStore'
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

  return (
    <>
      <AppShell />
      <SettingsPanel />
    </>
  )
}

export default App
