import { useEffect, useRef, useCallback } from 'react'
import { kiloApi } from '@/services/kiloClient'
import { useSessionStore } from '@/stores/sessionStore'
import { useConnectionStore } from '@/stores/connectionStore'
import type { KiloEvent, MessageChunk } from '@/types/kilo'

/**
 * SSE 事件流 Hook
 *
 * 监听 KiloCode CLI 的实时事件：
 * - 消息块（流式输出）
 * - 工具调用状态变更
 * - 权限请求
 * - 会话状态变更
 */
export function useEventStream() {
  const eventSourceRef = useRef<EventSource | null>(null)
  const { activeSessionId, addMessage, appendStreamingContent, setIsStreaming, addToolCall, updateToolCall } = useSessionStore()
  const { connected, addPermissionRequest } = useConnectionStore()

  /** 启动事件流监听 */
  const startListening = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    if (!connected) return

    const es = kiloApi.createEventStream(activeSessionId || undefined)
    eventSourceRef.current = es

    es.onopen = () => {
      console.log('[SSE] Connected to event stream')
    }

    es.onerror = () => {
      console.error('[SSE] Connection error')
      // 自动重连由 EventSource 内置处理
    }

    // 监听各类事件
    const eventTypes = [
      'message.created',
      'message.updated',
      'message.chunk',
      'tool_call.created',
      'tool_call.updated',
      'permission.requested',
      'permission.resolved',
      'session.updated',
      'status.changed',
    ]

    eventTypes.forEach((type) => {
      es.addEventListener(type, (event) => {
        try {
          const data = JSON.parse(event.data)
          handleEvent(type, data)
        } catch (err) {
          console.error(`[SSE] Failed to parse event ${type}:`, err)
        }
      })
    })
  }, [activeSessionId, connected])

  /** 处理事件 */
  const handleEvent = (type: string, data: unknown) => {
    switch (type) {
      case 'message.chunk': {
        const chunk = data as MessageChunk
        appendStreamingContent(chunk.content)
        if (chunk.isComplete) {
          setIsStreaming(false)
        }
        break
      }
      case 'message.created': {
        const message = data as any
        addMessage(message)
        setIsStreaming(true)
        break
      }
      case 'message.updated': {
        // 消息更新（如工具调用完成）
        const msg = data as any
        // updateMessage(msg.id, msg)
        break
      }
      case 'tool_call.created': {
        const toolCall = data as any
        addToolCall(toolCall)
        break
      }
      case 'tool_call.updated': {
        const toolCall = data as any
        updateToolCall(toolCall.id, toolCall)
        break
      }
      case 'permission.requested': {
        const request = data as any
        addPermissionRequest(request)
        break
      }
      default:
        console.log(`[SSE] Unhandled event: ${type}`, data)
    }
  }

  /** 停止监听 */
  const stopListening = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // 连接状态变化时启动/停止监听
  useEffect(() => {
    if (connected) {
      startListening()
    } else {
      stopListening()
    }
    return stopListening
  }, [connected, startListening, stopListening])

  // 活跃会话变化时重新连接事件流
  useEffect(() => {
    if (connected) {
      startListening()
    }
  }, [activeSessionId, connected, startListening])

  return {
    startListening,
    stopListening,
  }
}
