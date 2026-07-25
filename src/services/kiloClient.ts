import type {
  KiloSession,
  KiloMessage,
  KiloConfig,
  KiloModel,
  KiloProvider,
  McpServer,
  PermissionRequest,
  PermissionDecision,
  AgentMode,
  BrowserAction,
  BrowserActionResult,
  BrowserSnapshot,
  MemoryEntry,
} from '@/types/kilo'
import { useConnectionStore } from '@/stores/connectionStore'

/**
 * SSE 流式回调接口
 */
export interface StreamCallbacks {
  /** 收到文本块 */
  onChunk: (text: string) => void
  /** 新工具调用 */
  onToolCall: (toolCall: any) => void
  /** 工具调用状态更新 */
  onToolCallUpdate: (id: string, updates: any) => void
  /** 消息完成 */
  onMessageComplete: (message: KiloMessage) => void
  /** 错误 */
  onError: (error: string) => void
}

/**
 * KiloCode API 客户端
 *
 * 通过 HTTP REST API 与 KiloCode CLI 服务通信
 * 支持 SSE 流式接收 AI 回复
 */
class KiloApiClient {
  private get baseUrl(): string {
    const port = useConnectionStore.getState().port
    return `http://localhost:${port}`
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  /** 通用请求方法 */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...(options?.headers as Record<string, string>),
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // ===== 会话管理 =====

  async listSessions(): Promise<KiloSession[]> {
    return this.request('/session')
  }

  async createSession(options?: { mode?: AgentMode; model?: string; workingDir?: string }): Promise<KiloSession> {
    return this.request('/session', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    })
  }

  async getSession(id: string): Promise<KiloSession> {
    return this.request(`/session/${id}`)
  }

  async closeSession(id: string): Promise<void> {
    return this.request(`/session/${id}`, { method: 'DELETE' })
  }

  async forkSession(id: string, fromMessageId?: string): Promise<KiloSession> {
    return this.request(`/session/${id}/fork`, {
      method: 'POST',
      body: JSON.stringify({ fromMessageId }),
    })
  }

  async resumeSession(id: string): Promise<KiloSession> {
    return this.request(`/session/${id}/resume`, { method: 'POST' })
  }

  // ===== 消息 =====

  /**
   * 发送消息并接收流式回复
   *
   * 核心交互流程：
   * 1. POST /session/:id/prompt 发送消息
   * 2. 响应为 SSE 流（text/event-stream）
   * 3. 逐块解析事件并回调
   * 4. 流结束后组装完整消息
   */
  async promptStream(
    sessionId: string,
    message: string,
    callbacks: StreamCallbacks & { mode?: AgentMode; model?: string; fileIds?: string[] }
  ): Promise<void> {
    const { onChunk, onToolCall, onToolCallUpdate, onMessageComplete, onError, mode, model, fileIds } = callbacks
    const url = `${this.baseUrl}/session/${sessionId}/prompt`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ message, mode, model, fileIds }),
      })

      if (!response.ok) {
        // 如果 SSE 不可用，尝试普通 JSON 响应
        if (response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json()
          // 单次响应模式
          if (data.content) {
            onChunk(data.content)
          }
          onMessageComplete(data)
          return
        }
        throw new Error(`Prompt request failed: ${response.status}`)
      }

      // 解析 SSE 流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let messageId = `msg-${Date.now()}`
      const toolCalls: any[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 解析 SSE 事件（以 \n\n 分隔）
        const events = buffer.split('\n\n')
        buffer = events.pop() || '' // 保留未完成的部分

        for (const event of events) {
          const parsed = parseSSEEvent(event)
          if (!parsed) continue

          const { type, data } = parsed

          switch (type) {
            case 'message.chunk':
            case 'agent_message_chunk': {
              // 流式文本块
              const chunk = typeof data === 'string' ? data : data.content || data.text || ''
              if (chunk) {
                fullContent += chunk
                onChunk(chunk)
              }
              break
            }
            case 'message.created':
            case 'user_message': {
              // 用户消息确认
              if (data.id) messageId = data.id
              break
            }
            case 'tool_call':
            case 'tool_call.created': {
              // 新工具调用
              const tc = data.toolCall || data
              toolCalls.push(tc)
              onToolCall(tc)
              break
            }
            case 'tool_call.update':
            case 'tool_call.updated': {
              // 工具调用状态更新
              const tcUpdate = data.toolCall || data
              if (tcUpdate.id) {
                onToolCallUpdate(tcUpdate.id, tcUpdate)
              }
              break
            }
            case 'message.complete':
            case 'agent_message':
            case 'done': {
              // 消息完成
              const content = data.content || data.text || fullContent
              const completeMessage: KiloMessage = {
                id: data.id || messageId,
                sessionId,
                role: 'assistant',
                content,
                timestamp: new Date().toISOString(),
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                metadata: {
                  model: data.model,
                  mode: data.mode,
                  duration: data.duration,
                  tokenUsage: data.tokenUsage || data.usage,
                },
              }
              onMessageComplete(completeMessage)
              break
            }
            case 'error': {
              onError(data.message || data.error || 'Unknown error')
              break
            }
            default: {
              // 未知事件类型，尝试提取文本内容
              if (data && typeof data === 'object' && data.content) {
                fullContent += data.content
                onChunk(data.content)
              }
            }
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.trim()) {
        const parsed = parseSSEEvent(buffer)
        if (parsed?.data) {
          const data = parsed.data
          if (typeof data === 'object' && data.content) {
            fullContent += data.content
            onChunk(data.content)
          }
        }
      }

      // 如果流结束但没有收到 complete 事件，手动完成
      if (fullContent) {
        onMessageComplete({
          id: messageId,
          sessionId,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        })
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Stream failed')
    }
  }

  /** 取消当前生成 */
  async cancel(sessionId: string): Promise<void> {
    return this.request(`/session/${sessionId}/cancel`, { method: 'POST' })
  }

  /** 获取会话消息列表 */
  async listMessages(sessionId: string): Promise<KiloMessage[]> {
    return this.request(`/session/${sessionId}/message`)
  }

  // ===== 文件上传 =====

  /**
   * 上传文件到会话
   *
   * 支持图片（PNG/JPG/GIF/WebP）和文档（PDF/TXT/MD）
   * 图片会作为视觉上下文传给模型，文档会作为文本上下文
   */
  async uploadFile(sessionId: string, file: File): Promise<{ id: string; type: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseUrl}/session/${sessionId}/upload`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // 不设 Content-Type，让浏览器自动设置 multipart boundary
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`)
    }
    return response.json()
  }

  /** 上传文件内容（Base64 编码）*/
  async uploadBase64(
    sessionId: string,
    data: string,
    mimeType: string,
    filename: string
  ): Promise<{ id: string; type: string }> {
    return this.request(`/session/${sessionId}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, mimeType, filename }),
    })
  }

  // ===== 内联补全 =====

  /**
   * 请求内联自动补全
   *
   * 输入当前文件内容和光标位置，返回补全建议
   */
  async inlineCompletion(
    sessionId: string,
    params: {
      fileUri: string
      content: string
      cursorLine: number
      cursorColumn: number
      language: string
    }
  ): Promise<{ completion: string; range?: { startLine: number; endLine: number } }> {
    return this.request(`/session/${sessionId}/completion`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // ===== 代码库索引 =====

  /** 获取索引状态 */
  async getIndexStatus(): Promise<{ indexed: boolean; fileCount: number; lastIndexed: string }> {
    return this.request('/index/status')
  }

  /** 触发索引构建 */
  async triggerIndexing(): Promise<void> {
    return this.request('/index/build', { method: 'POST' })
  }

  // ===== 配置 =====

  async getConfig(): Promise<KiloConfig> {
    return this.request('/config')
  }

  async updateConfig(updates: Partial<KiloConfig>): Promise<KiloConfig> {
    return this.request('/config', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async setMode(sessionId: string, mode: AgentMode): Promise<void> {
    return this.request(`/session/${sessionId}/mode`, {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    })
  }

  async setModel(sessionId: string, model: string): Promise<void> {
    return this.request(`/session/${sessionId}/model`, {
      method: 'PUT',
      body: JSON.stringify({ model }),
    })
  }

  // ===== 模型与提供商 =====

  async listModels(): Promise<KiloModel[]> {
    return this.request('/provider/model')
  }

  async listProviders(): Promise<KiloProvider[]> {
    return this.request('/provider')
  }

  // ===== MCP =====

  async listMcpServers(): Promise<McpServer[]> {
    return this.request('/mcp')
  }

  async addMcpServer(server: Omit<McpServer, 'id' | 'status'>): Promise<McpServer> {
    return this.request('/mcp', {
      method: 'POST',
      body: JSON.stringify(server),
    })
  }

  async removeMcpServer(id: string): Promise<void> {
    return this.request(`/mcp/${id}`, { method: 'DELETE' })
  }

  // ===== 权限 =====

  async listPermissionRequests(sessionId: string): Promise<PermissionRequest[]> {
    return this.request(`/session/${sessionId}/permission`)
  }

  async resolvePermission(sessionId: string, permissionId: string, decision: PermissionDecision): Promise<void> {
    return this.request(`/session/${sessionId}/permission/${permissionId}`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    })
  }

  // ===== 文件 =====

  async listFiles(dirPath: string): Promise<string[]> {
    return this.request(`/file?path=${encodeURIComponent(dirPath)}`)
  }

  async readFile(filePath: string): Promise<string> {
    const result = await this.request<{ content: string }>(`/file?path=${encodeURIComponent(filePath)}`)
    return result.content
  }

  // ===== SSE 事件流（全局监听）=====

  createEventStream(sessionId?: string): EventSource {
    const path = sessionId
      ? `/event?session=${sessionId}`
      : '/event'
    return new EventSource(`${this.baseUrl}${path}`)
  }

  // ===== 健康检查 =====

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { method: 'GET' })
      return response.ok
    } catch {
      return false
    }
  }

  // ===== 浏览器控制 =====

  /**
   * 启动浏览器实例
   *
   * 为指定会话创建一个浏览器上下文
   */
  async launchBrowser(sessionId: string): Promise<{ browserId: string }> {
    return this.request(`/session/${sessionId}/browser`, {
      method: 'POST',
      body: JSON.stringify({ action: 'launch' }),
    })
  }

  /**
   * 关闭浏览器实例
   */
  async closeBrowser(sessionId: string): Promise<void> {
    return this.request(`/session/${sessionId}/browser`, {
      method: 'POST',
      body: JSON.stringify({ action: 'close' }),
    })
  }

  /**
   * 获取当前页面快照
   *
   * 返回无障碍树 + 可选截图，供 AI 理解页面结构
   */
  async browserSnapshot(sessionId: string, includeScreenshot = true): Promise<BrowserSnapshot> {
    return this.request(`/session/${sessionId}/browser`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'snapshot',
        includeScreenshot,
      }),
    })
  }

  /**
   * 执行浏览器操作
   *
   * 支持导航、点击、输入、滚动、截图、JS执行等
   */
  async browserAction(sessionId: string, action: BrowserAction): Promise<BrowserActionResult> {
    return this.request(`/session/${sessionId}/browser`, {
      method: 'POST',
      body: JSON.stringify({ action: action.type, ...action }),
    })
  }

  /**
   * 批量执行浏览器操作序列
   *
   * 按顺序执行多个操作，每步之间自动等待
   */
  async browserActionSequence(
    sessionId: string,
    actions: BrowserAction[]
  ): Promise<BrowserActionResult[]> {
    return this.request(`/session/${sessionId}/browser/sequence`, {
      method: 'POST',
      body: JSON.stringify({ actions }),
    })
  }

  // ===== 记忆库 =====

  /** 获取记忆库条目列表 */
  async listMemory(sessionId?: string): Promise<MemoryEntry[]> {
    const path = sessionId
      ? `/session/${sessionId}/memory`
      : '/memory'
    return this.request(path)
  }

  /** 添加记忆条目 */
  async addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
    return this.request('/memory', {
      method: 'POST',
      body: JSON.stringify(entry),
    })
  }

  /** 删除记忆条目 */
  async removeMemory(id: string): Promise<void> {
    return this.request(`/memory/${id}`, { method: 'DELETE' })
  }

  /** 搜索记忆条目 */
  async searchMemory(query: string): Promise<MemoryEntry[]> {
    return this.request(`/memory/search?q=${encodeURIComponent(query)}`)
  }
}

/** 解析单个 SSE 事件 */
function parseSSEEvent(raw: string): { type: string; data: any } | null {
  let type = 'message'
  let dataStr = ''

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) {
      type = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataStr += line.slice(5).trim()
    } else if (line.startsWith('id:')) {
      // SSE event ID，暂不使用
    }
  }

  if (!dataStr) return null

  try {
    const data = JSON.parse(dataStr)
    return { type, data }
  } catch {
    // 非 JSON 数据，作为纯文本处理
    return { type, data: dataStr }
  }
}

/** 全局 API 客户端实例 */
export const kiloApi = new KiloApiClient()
