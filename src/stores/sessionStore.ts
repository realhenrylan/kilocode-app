import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KiloSession, AgentMode, KiloMessage, KiloToolCall, MessageChunk, FileAttachment } from '@/types/kilo'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'
import { useTokenUsageStore } from '@/stores/tokenUsageStore'
import { useConfigStore } from '@/stores/configStore'

/**
 * 会话状态管理
 *
 * 管理当前会话列表、活跃会话、消息流等核心数据
 * 核心交互流程：sendMessage → API prompt → SSE流式接收 → 渲染AI回复
 *
 * 自动恢复：通过 persist 中间件将关键状态持久化到 localStorage，
 * 应用崩溃/重启后自动恢复会话上下文
 */
interface SessionState {
  /** 所有会话列表 */
  sessions: KiloSession[]
  /** 当前活跃会话 ID */
  activeSessionId: string | null
  /** 当前会话的消息列表 */
  messages: KiloMessage[]
  /** 当前流式输出内容（未完成的消息） */
  streamingContent: string
  /** 是否正在流式输出 */
  isStreaming: boolean
  /** 当前活跃的工具调用 */
  activeToolCalls: KiloToolCall[]
  /** 当前模式 */
  currentMode: AgentMode
  /** 当前模型 */
  currentModel: string
  /** 工作目录 */
  workingDir: string
  /** 流式消息的 ID（用于更新最终消息） */
  streamingMessageId: string | null
  /** 上次会话是否被中断（用于恢复提示） */
  wasInterrupted: boolean

  // Actions
  setSessions: (sessions: KiloSession[]) => void
  addSession: (session: KiloSession) => void
  removeSession: (id: string) => void
  setActiveSession: (id: string | null) => void
  setMessages: (messages: KiloMessage[]) => void
  addMessage: (message: KiloMessage) => void
  updateMessage: (id: string, updates: Partial<KiloMessage>) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void
  setIsStreaming: (streaming: boolean) => void
  setActiveToolCalls: (calls: KiloToolCall[]) => void
  addToolCall: (call: KiloToolCall) => void
  updateToolCall: (id: string, updates: Partial<KiloToolCall>) => void
  setCurrentMode: (mode: AgentMode) => void
  setCurrentModel: (model: string) => void
  setWorkingDir: (dir: string) => void
  applyChunk: (chunk: MessageChunk) => void
  reset: () => void

  // 核心交互 Actions
  /** 发送消息（核心流程：创建会话→发送→流式接收→渲染） */
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>
  /** 取消当前生成 */
  cancelGeneration: () => Promise<void>
  /** 加载会话列表 */
  loadSessions: () => Promise<void>
  /** 切换到指定会话并加载消息 */
  switchToSession: (id: string) => Promise<void>
  /** 创建新会话 */
  createNewSession: () => Promise<void>
  /** 删除会话 */
  deleteSession: (id: string) => Promise<void>
  /** 分叉会话 */
  forkSession: (id: string, fromMessageId?: string) => Promise<void>
  /** 切换模式（同时通知 API） */
  changeMode: (mode: AgentMode) => Promise<void>
  /** 切换模型（同时通知 API） */
  changeModel: (model: string) => Promise<void>
  /** 重置中断标记 */
  setWasInterrupted: (value: boolean) => void
  /** 恢复会话（连接恢复后调用，通知服务端恢复上下文） */
  resumeSession: (id: string) => Promise<void>
}

const initialState = {
  sessions: [],
  activeSessionId: null,
  messages: [],
  streamingContent: '',
  isStreaming: false,
  activeToolCalls: [],
  currentMode: 'code' as AgentMode,
  currentModel: 'claude-sonnet-4-20250514',
  workingDir: '',
  streamingMessageId: null as string | null,
  wasInterrupted: false,
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  ...initialState,

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) => set((s) => ({
    sessions: s.sessions.filter((sess) => sess.id !== id),
    activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
  })),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateMessage: (id, updates) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? { ...m, ...updates } : m),
  })),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk,
  })),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setActiveToolCalls: (calls) => set({ activeToolCalls: calls }),
  addToolCall: (call) => set((s) => ({
    activeToolCalls: [...s.activeToolCalls, call],
  })),
  updateToolCall: (id, updates) => set((s) => ({
    activeToolCalls: s.activeToolCalls.map((c) => c.id === id ? { ...c, ...updates } : c),
  })),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setWorkingDir: (dir) => set({ workingDir: dir }),

  applyChunk: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk.content,
    isStreaming: !chunk.isComplete,
  })),

  reset: () => set(initialState),

  // ===== 核心交互流程 =====

  /**
   * 发送消息
   *
   * 完整流程：
   * 1. 如果没有活跃会话，先创建一个
   * 2. 将用户消息添加到本地消息列表
   * 3. 调用 kiloClient.prompt API
   * 4. 通过 SSE 流式接收 AI 回复
   * 5. 实时更新 streamingContent
   * 6. 流式完成后将完整消息添加到 messages
   */
  sendMessage: async (content: string, attachments?: FileAttachment[]) => {
    const state = get()
    if (state.isStreaming) return

    const connected = useConnectionStore.getState().connected
    let sessionId = state.activeSessionId

    // 1. 如果没有活跃会话，创建一个
    if (!sessionId) {
      try {
        const session = await kiloApi.createSession({
          mode: state.currentMode,
          model: state.currentModel,
          workingDir: state.workingDir || undefined,
        })
        sessionId = session.id
        set({
          activeSessionId: session.id,
          sessions: [session, ...state.sessions],
        })
      } catch (err) {
        console.error('[sendMessage] Failed to create session:', err)
        // 降级：使用本地模拟会话
        sessionId = `local-${Date.now()}`
        set({
          activeSessionId: sessionId,
          sessions: [{
            id: sessionId,
            title: content.slice(0, 50),
            mode: state.currentMode,
            model: state.currentModel,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            workingDir: state.workingDir,
            messageCount: 0,
          }, ...state.sessions],
        })
      }
    }

    // 2. 如果有附件且已连接 API，先上传文件
    let uploadedFileIds: string[] = []
    if (attachments && attachments.length > 0 && connected) {
      for (const attachment of attachments) {
        try {
          if (attachment.isBase64) {
            const result = await kiloApi.uploadBase64(
              sessionId,
              attachment.content,
              attachment.mimeType,
              attachment.name
            )
            uploadedFileIds.push(result.id)
          } else {
            // 文本文件：构造 File 对象上传
            const blob = new Blob([attachment.content], { type: attachment.mimeType })
            const file = new File([blob], attachment.name, { type: attachment.mimeType })
            const result = await kiloApi.uploadFile(sessionId, file)
            uploadedFileIds.push(result.id)
          }
        } catch (err) {
          console.error('[sendMessage] Failed to upload file:', attachment.name, err)
        }
      }
    }

    // 3. 构建消息内容（附件信息嵌入文本）
    let messageContent = content
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments
        .map((a) => {
          const sizeStr = a.size > 1024 * 1024
            ? `${(a.size / 1024 / 1024).toFixed(1)}MB`
            : a.size > 1024
              ? `${(a.size / 1024).toFixed(1)}KB`
              : `${a.size}B`
          return `[附件: ${a.name} (${a.mimeType}, ${sizeStr})]`
        })
        .join('\n')
      messageContent = `${attachmentInfo}\n\n${content}`
    }

    // 4. 添加用户消息到本地
    const userMessage: KiloMessage = {
      id: `user-${Date.now()}`,
      sessionId: sessionId,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      attachments,
    }
    set((s) => ({
      messages: [...s.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      streamingMessageId: null,
      activeToolCalls: [],
    }))

    // 5. 调用 API 发送消息并接收流式回复
    try {
      if (connected) {
        // 真实 API 调用 + SSE 流式接收
        await kiloApi.promptStream(sessionId, messageContent, {
          mode: state.currentMode,
          model: state.currentModel,
          fileIds: uploadedFileIds.length > 0 ? uploadedFileIds : undefined,
          onChunk: (chunk) => {
            // 流式文本块
            set((s) => ({
              streamingContent: s.streamingContent + chunk,
            }))
          },
          onToolCall: (toolCall) => {
            set((s) => ({
              activeToolCalls: [...s.activeToolCalls, toolCall],
            }))
          },
          onToolCallUpdate: (id, updates) => {
            set((s) => ({
              activeToolCalls: s.activeToolCalls.map((c) =>
                c.id === id ? { ...c, ...updates } : c
              ),
            }))
          },
          onMessageComplete: (message) => {
            // 流式完成，将完整消息添加到列表
            set((s) => ({
              messages: [...s.messages, message],
              streamingContent: '',
              isStreaming: false,
              streamingMessageId: message.id,
              activeToolCalls: [],
            }))
            // 记录 Token 用量（如果消息元数据中有）
            if (message.metadata?.tokenUsage) {
              useTokenUsageStore.getState().recordUsage(message.metadata.tokenUsage)
            }
          },
          onError: (error) => {
            console.error('[sendMessage] Stream error:', error)
            set({ isStreaming: false })
          },
        })
      } else {
        // 未连接 CLI 时使用模拟回复（开发/演示模式）
        await simulateReply(messageContent, state.currentMode)
      }
    } catch (err) {
      console.error('[sendMessage] Failed:', err)
      set({ isStreaming: false })
    }
  },

  /** 取消当前生成 */
  cancelGeneration: async () => {
    const { activeSessionId } = get()
    if (!activeSessionId) return

    try {
      await kiloApi.cancel(activeSessionId)
    } catch {
      // 即使 API 调用失败也要停止本地状态
    }

    // 将当前流式内容保存为一条消息
    const { streamingContent, messages } = get()
    if (streamingContent) {
      const assistantMessage: KiloMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: activeSessionId,
        role: 'assistant',
        content: streamingContent + '\n\n*[生成已中断]*',
        timestamp: new Date().toISOString(),
      }
      set({
        messages: [...messages, assistantMessage],
        streamingContent: '',
        isStreaming: false,
        activeToolCalls: [],
      })
    } else {
      set({ isStreaming: false })
    }
  },

  /** 加载会话列表 */
  loadSessions: async () => {
    try {
      const sessions = await kiloApi.listSessions()
      set({ sessions })
    } catch (err) {
      console.error('[loadSessions] Failed:', err)
    }
  },

  /** 切换到指定会话并加载消息 */
  switchToSession: async (id: string) => {
    set({ activeSessionId: id, messages: [], streamingContent: '' })
    try {
      const messages = await kiloApi.listMessages(id)
      set({ messages })
      // 更新会话的模式和模型
      const session = get().sessions.find((s) => s.id === id)
      if (session) {
        set({
          currentMode: session.mode,
          currentModel: session.model,
        })
      }
    } catch (err) {
      console.error('[switchToSession] Failed:', err)
    }
  },

  /** 创建新会话 */
  createNewSession: async () => {
    const state = get()
    try {
      const session = await kiloApi.createSession({
        mode: state.currentMode,
        model: state.currentModel,
        workingDir: state.workingDir || undefined,
      })
      set((s) => ({
        sessions: [session, ...s.sessions],
        activeSessionId: session.id,
        messages: [],
        streamingContent: '',
        isStreaming: false,
      }))
    } catch (err) {
      console.error('[createNewSession] Failed:', err)
      // 降级：本地创建
      const localSession: KiloSession = {
        id: `local-${Date.now()}`,
        title: '新会话',
        mode: state.currentMode,
        model: state.currentModel,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workingDir: state.workingDir,
        messageCount: 0,
      }
      set((s) => ({
        sessions: [localSession, ...s.sessions],
        activeSessionId: localSession.id,
        messages: [],
        streamingContent: '',
        isStreaming: false,
      }))
    }
  },

  /** 删除会话 */
  deleteSession: async (id: string) => {
    try {
      await kiloApi.closeSession(id)
    } catch {
      // 即使 API 失败也删除本地
    }
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
      messages: s.activeSessionId === id ? [] : s.messages,
    }))
  },

  /** 分叉会话 */
  forkSession: async (id: string, fromMessageId?: string) => {
    const connected = useConnectionStore.getState().connected

    if (connected) {
      try {
        const newSession = await kiloApi.forkSession(id, fromMessageId)
        set((s) => ({
          sessions: [newSession, ...s.sessions],
          activeSessionId: newSession.id,
        }))
        // 加载新会话的消息
        const messages = await kiloApi.listMessages(newSession.id)
        set({ messages })
      } catch (err) {
        console.error('[forkSession] Failed:', err)
      }
    } else {
      // 未连接 CLI 时：本地模拟分叉
      const state = get()
      const sourceSession = state.sessions.find((s) => s.id === id)
      if (!sourceSession) return

      // 复制消息到分叉点
      const forkIndex = fromMessageId
        ? state.messages.findIndex((m) => m.id === fromMessageId)
        : state.messages.length
      const forkMessages = forkIndex >= 0
        ? state.messages.slice(0, forkIndex + 1)
        : [...state.messages]

      const newSession: KiloSession = {
        id: `local-fork-${Date.now()}`,
        title: `${sourceSession.title} (分叉)`,
        mode: sourceSession.mode,
        model: sourceSession.model,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workingDir: sourceSession.workingDir,
        messageCount: forkMessages.length,
      }

      set((s) => ({
        sessions: [newSession, ...s.sessions],
        activeSessionId: newSession.id,
        messages: forkMessages.map((m) => ({ ...m, sessionId: newSession.id })),
        streamingContent: '',
        isStreaming: false,
        activeToolCalls: [],
      }))
    }
  },

  /** 切换模式（同时通知 API） */
  changeMode: async (mode: AgentMode) => {
    set({ currentMode: mode })
    const { activeSessionId } = get()
    if (activeSessionId) {
      try {
        await kiloApi.setMode(activeSessionId, mode)
      } catch {
        // API 失败不影响本地状态
      }
    }
  },

  /** 切换模型（同时通知 API） */
  changeModel: async (model: string) => {
    set({ currentModel: model })
    const { activeSessionId } = get()
    if (activeSessionId) {
      try {
        await kiloApi.setModel(activeSessionId, model)
      } catch {
        // API 失败不影响本地状态
      }
    }
  },

  setWasInterrupted: (value) => set({ wasInterrupted: value }),

  /** 恢复会话（连接恢复后调用，通知服务端恢复上下文） */
  resumeSession: async (id: string) => {
    try {
      await kiloApi.resumeSession(id)
      // 恢复成功后重新加载消息
      const messages = await kiloApi.listMessages(id)
      set({ messages })
    } catch (err) {
      console.warn('[resumeSession] Failed, local persist data still available:', err)
    }
  },
}),
{
  name: 'kilocode-session',
  /** 只持久化可恢复的状态；isStreaming 用于中断检测，恢复后重置 */
  partialize: (state) => ({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    messages: state.messages,
    currentMode: state.currentMode,
    currentModel: state.currentModel,
    workingDir: state.workingDir,
    // 持久化 isStreaming 以检测中断（merge 中会重置为 false）
    isStreaming: state.isStreaming,
  }),
  /** 恢复后重置流式状态，避免残留；检测中断状态 */
  merge: (persistedState, currentState) => {
    const persisted = persistedState as Partial<SessionState>
    // 检测中断：如果持久化的 isStreaming 为 true，说明上次会话被中断
    const wasInterrupted = !!(persisted as any).isStreaming
    return {
      ...currentState,
      ...persisted,
      // 流式状态始终重置为初始值
      streamingContent: '',
      isStreaming: false,
      activeToolCalls: [],
      streamingMessageId: null,
      // 中断检测
      wasInterrupted: wasInterrupted || currentState.wasInterrupted,
    }
  },
}
  )
)

/**
 * 未连接 CLI 时的提示回复
 *
 * 明确告知用户当前未连接，避免伪装成 AI 回复造成误解
 */
async function simulateReply(_userContent: string, mode: AgentMode): Promise<void> {
  // 获取当前模式名称（支持自定义模式）
  const customModes = useConfigStore.getState().customModes
  const customMode = customModes.find((m) => m.slug === mode)
  const modeName = customMode?.name || mode

  const response = `⚠️ **未连接到 AI 服务**\n\n当前未检测到 CLI 连接，无法调用 AI 模型。\n\n**请检查以下事项：**\n1. 确认 KiloCode CLI 已启动并运行\n2. 检查 API Key 是否已正确配置\n3. 查看状态栏的连接状态指示器\n\n当前模式：**${modeName}**\n\n连接成功后，你的消息将发送给 AI 模型处理。`

  // 逐字输出，保持流式 UI 体验
  const chars = response.split('')
  for (let i = 0; i < chars.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 8 + Math.random() * 12))
    useSessionStore.setState((s) => ({
      streamingContent: s.streamingContent + chars[i],
    }))
  }

  // 流式完成，添加系统提示消息（标记为 system 而非 assistant，避免混淆）
  const assistantMessage: KiloMessage = {
    id: `system-${Date.now()}`,
    sessionId: useSessionStore.getState().activeSessionId || 'local',
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString(),
    metadata: {
      isSystemNotice: true, // 标记为系统提示，UI 可据此区分样式
    },
  }
  useSessionStore.setState((s) => ({
    messages: [...s.messages, assistantMessage],
    streamingContent: '',
    isStreaming: false,
    activeToolCalls: [],
  }))
}
