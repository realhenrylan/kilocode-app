import { useEffect, useState, useCallback, useRef } from 'react'
import { useConnectionStore } from '@/stores/connectionStore'
import { useConfigStore } from '@/stores/configStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useIndexStore } from '@/stores/indexStore'

/**
 * KiloCode CLI 连接 Hook
 *
 * 管理与 KiloCode CLI 服务的连接状态
 * 首次连接成功后自动加载配置、模型、会话等数据
 * 安全处理非 Electron 环境（浏览器预览模式）
 */
export function useKiloConnection() {
  const { connected, port, error, setConnected, setPort, setError, setReconnecting } = useConnectionStore()
  const [retryCount, setRetryCount] = useState(0)
  const hasLoadedRef = useRef(false)

  const isElectron = typeof window !== 'undefined' && !!window.api?.kilo

  /** 初始化连接 */
  const connect = useCallback(async () => {
    if (!isElectron) {
      // 浏览器预览模式，标记为未连接但不报错
      setConnected(false)
      return
    }

    try {
      const cliPort = await window.api.kilo.getPort()
      setPort(cliPort)

      const ready = await window.api.kilo.isReady()
      setConnected(ready)

      if (ready) {
        setError(null)
        setRetryCount(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败')
      setConnected(false)
    }
  }, [isElectron, setConnected, setPort, setError])

  /** 重连 */
  const reconnect = useCallback(async () => {
    if (!isElectron) return
    setReconnecting(true)
    try {
      await window.api.kilo.restart()
      await new Promise((resolve) => setTimeout(resolve, 3000))
      await connect()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重连失败')
    } finally {
      setReconnecting(false)
    }
  }, [isElectron, connect, setReconnecting, setError])

  // 自动连接 + 重试
  useEffect(() => {
    connect()

    const interval = setInterval(() => {
      if (!connected && retryCount < 10 && isElectron) {
        connect()
        setRetryCount((c) => c + 1)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [connect, connected, retryCount, isElectron])

  // 首次连接成功后自动加载数据
  useEffect(() => {
    if (connected && !hasLoadedRef.current) {
      hasLoadedRef.current = true

      // 并行加载所有初始数据
      const { loadConfig, loadModels, loadProviders, loadMcpServers } = useConfigStore.getState()
      const { loadSessions } = useSessionStore.getState()
      const { loadIndexStatus } = useIndexStore.getState()

      Promise.allSettled([
        loadConfig(),
        loadModels(),
        loadProviders(),
        loadMcpServers(),
        loadSessions(),
        loadIndexStatus(),
      ]).catch((err) => {
        console.error('[useKiloConnection] Initial data load failed:', err)
      })
    }
  }, [connected])

  return {
    connected,
    port,
    error,
    connect,
    reconnect,
    /** API 基础 URL */
    baseUrl: `http://localhost:${port}`,
  }
}
