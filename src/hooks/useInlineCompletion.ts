import { useState, useCallback, useRef, useEffect } from 'react'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'
import { useSessionStore } from '@/stores/sessionStore'

/**
 * 内联自动补全 Hook
 *
 * 在 Composer 输入时，根据上下文提供补全建议
 * - 已连接 CLI：调用 /session/:id/completion API
 * - 未连接：基于关键词的本地补全
 *
 * 用法：
 * const { suggestion, acceptSuggestion, dismissSuggestion } = useInlineCompletion()
 */

/** 本地补全关键词库（未连接 CLI 时的降级方案） */
const LOCAL_SUGGESTIONS: Record<string, string[]> = {
  '/': ['/code', '/plan', '/ask', '/debug', '/review', '/clear', '/compact', '/fork', '/model', '/help'],
  '帮我': ['帮我写一个', '帮我实现', '帮我修复', '帮我优化', '帮我重构'],
  '请': ['请解释', '请分析', '请审查', '请优化', '请生成'],
  '创建': ['创建一个组件', '创建一个函数', '创建一个模块', '创建一个测试'],
  '实现': ['实现一个功能', '实现一个接口', '实现一个算法', '实现一个工具类'],
  '修复': ['修复这个 bug', '修复类型错误', '修复性能问题', '修复内存泄漏'],
  '优化': ['优化性能', '优化代码结构', '优化查询', '优化渲染'],
  '添加': ['添加错误处理', '添加类型定义', '添加单元测试', '添加文档注释'],
  '写': ['写一个函数', '写一个组件', '写一个测试', '写一个脚本'],
  '解释': ['解释这段代码', '解释这个概念', '解释这个错误', '解释这个设计'],
}

interface CompletionState {
  /** 当前补全建议文本 */
  suggestion: string
  /** 补全建议的来源（ghost text 显示在输入框中） */
  ghostText: string
  /** 是否正在请求补全 */
  isLoading: boolean
  /** 接受补全建议 */
  acceptSuggestion: () => void
  /** 清除补全建议 */
  dismissSuggestion: () => void
  /** 触发补全请求 */
  requestCompletion: (input: string, cursorPosition: number) => void
}

export function useInlineCompletion(): CompletionState {
  const [suggestion, setSuggestion] = useState('')
  const [ghostText, setGhostText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 清理
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  /** 本地关键词补全 */
  const localComplete = useCallback((input: string): string => {
    if (!input) return ''

    // 检查是否匹配关键词前缀
    for (const [prefix, completions] of Object.entries(LOCAL_SUGGESTIONS)) {
      if (input.endsWith(prefix)) {
        // 返回第一个补全建议的剩余部分
        const first = completions[0]
        return first.slice(prefix.length)
      }
    }

    // 检查输入末尾是否匹配某个补全的前缀
    const lastWord = input.split(/\s/).pop() || ''
    if (lastWord.length < 2) return ''

    for (const completions of Object.values(LOCAL_SUGGESTIONS)) {
      for (const comp of completions) {
        if (comp.startsWith(lastWord) && comp !== lastWord) {
          return comp.slice(lastWord.length)
        }
      }
    }

    return ''
  }, [])

  /** 触发补全请求 */
  const requestCompletion = useCallback((input: string, cursorPosition: number) => {
    // 清除之前的请求
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    // 空输入或太短不补全
    if (!input || input.length < 2) {
      setSuggestion('')
      setGhostText('')
      return
    }

    // 防抖 300ms
    debounceRef.current = setTimeout(async () => {
      const connected = useConnectionStore.getState().connected
      const sessionId = useSessionStore.getState().activeSessionId

      if (connected && sessionId) {
        // 真实 API 补全
        setIsLoading(true)
        const controller = new AbortController()
        abortRef.current = controller

        try {
          const result = await kiloApi.inlineCompletion(sessionId, {
            fileUri: 'composer://input',
            content: input,
            cursorLine: 1,
            cursorColumn: cursorPosition,
            language: 'markdown',
          })

          if (!controller.signal.aborted && result.completion) {
            setSuggestion(result.completion)
            setGhostText(result.completion)
          }
        } catch (err) {
          // API 失败，降级到本地补全
          const local = localComplete(input)
          setSuggestion(local)
          setGhostText(local)
        } finally {
          setIsLoading(false)
        }
      } else {
        // 本地补全
        const local = localComplete(input)
        setSuggestion(local)
        setGhostText(local)
      }
    }, 300)
  }, [localComplete])

  /** 接受补全建议 */
  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return
    const accepted = suggestion
    setSuggestion('')
    setGhostText('')
    return accepted
  }, [suggestion])

  /** 清除补全建议 */
  const dismissSuggestion = useCallback(() => {
    setSuggestion('')
    setGhostText('')
  }, [])

  return {
    suggestion,
    ghostText,
    isLoading,
    acceptSuggestion,
    dismissSuggestion,
    requestCompletion,
  }
}
