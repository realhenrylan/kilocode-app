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
 * 模拟 AI 回复（未连接 CLI 时的开发/演示模式）
 *
 * 逐字输出模拟回复，让 UI 交互流程可验证
 */
async function simulateReply(userContent: string, mode: AgentMode): Promise<void> {
  const modeResponses: Record<string, string> = {
    code: `我来帮你实现这个功能。\n\n\`\`\`typescript\n// 示例代码实现\nfunction hello(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(hello("KiloCode"));\n\`\`\`\n\n这段代码定义了一个简单的 \`hello\` 函数。你可以告诉我更多需求，我会继续完善实现。`,
    plan: `## 架构设计方案\n\n基于你的需求，我建议以下方案：\n\n### 1. 整体架构\n- 采用模块化设计\n- 分层架构：表示层 → 业务层 → 数据层\n\n### 2. 技术选型\n- 前端：React + TypeScript\n- 状态管理：Zustand\n- 样式：Tailwind CSS\n\n### 3. 实现步骤\n1. 搭建项目脚手架\n2. 实现核心数据模型\n3. 开发 UI 组件\n4. 集成测试\n\n需要我深入某个部分吗？`,
    ask: `关于你的问题：\n\n这是一个很好的问题。让我从几个角度来分析：\n\n1. **技术层面**：当前方案采用了成熟的技术栈，社区支持良好\n2. **性能层面**：通过合理的架构设计，可以满足大部分场景的性能需求\n3. **可维护性**：模块化设计使得后续维护和扩展更加容易\n\n如果你需要更具体的解答，请提供更多上下文信息。`,
    debug: `让我帮你排查这个问题。\n\n### 调试步骤\n\n1. **检查错误信息**：请提供完整的错误堆栈\n2. **验证输入数据**：确认传入参数是否符合预期\n3. **检查依赖版本**：确保所有依赖版本兼容\n\n### 常见原因\n- 类型不匹配\n- 异步操作未正确处理\n- 环境变量未配置\n\n请分享具体的错误信息，我可以给出更精准的修复方案。`,
    review: `## 代码审查报告\n\n### 总体评价\n代码结构清晰，命名规范，整体质量良好。\n\n### 建议改进\n\n1. **错误处理** ⚠️\n   - 建议添加更完善的错误边界处理\n   - 考虑添加重试机制\n\n2. **性能优化** 📊\n   - 大列表考虑使用虚拟滚动\n   - 避免不必要的重渲染\n\n3. **安全性** 🔒\n   - 确保用户输入经过验证和清理\n   - API 调用添加超时处理\n\n### 亮点\n- TypeScript 类型定义完整\n- 组件职责划分清晰`,
  }

  // 自定义模式：使用系统提示词生成通用回复
  let response = modeResponses[mode]
  if (!response) {
    // 尝试从自定义模式中获取名称
    const customModes = useConfigStore.getState().customModes
    const customMode = customModes.find((m) => m.slug === mode)
    const modeName = customMode?.name || mode
    response = `[${modeName} 模式]\n\n我已切换到 **${modeName}** 模式。${customMode?.description ? ` ${customMode.description}` : ''}\n\n请告诉我你需要什么帮助，我会按照此模式的专属策略来响应。`
  }
  const chars = response.split('')

  // 逐字输出，模拟流式效果
  for (let i = 0; i < chars.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 8 + Math.random() * 12))
    useSessionStore.setState((s) => ({
      streamingContent: s.streamingContent + chars[i],
    }))
  }

  // 流式完成，添加完整消息
  const inputTokens = Math.ceil(userContent.length / 4) // 粗略估算：4 字符 ≈ 1 token
  const outputTokens = Math.ceil(response.length / 4)
  const assistantMessage: KiloMessage = {
    id: `assistant-${Date.now()}`,
    sessionId: useSessionStore.getState().activeSessionId || 'local',
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString(),
    metadata: {
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: inputTokens * 0.003 / 1000 + outputTokens * 0.015 / 1000, // 模拟 Claude Sonnet 定价
      },
      duration: chars.length * 14, // 模拟耗时（ms）
    },
  }
  useSessionStore.setState((s) => ({
    messages: [...s.messages, assistantMessage],
    streamingContent: '',
    isStreaming: false,
    activeToolCalls: [],
  }))
  // 记录模拟 Token 用量
  useTokenUsageStore.getState().recordUsage(assistantMessage.metadata!.tokenUsage!)
}
