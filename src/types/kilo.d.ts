/**
 * KiloCode 类型定义
 *
 * 基于 KiloCode CLI HTTP REST API 和 ACP 协议
 * 覆盖会话、消息、工具调用、配置等核心数据结构
 */

/* ===== 主题类型 ===== */
export type ThemeMode = 'dark' | 'light' | 'system'

/* ===== Agent 模式 ===== */
/** 内置 Agent 模式 */
export type BuiltinMode = 'code' | 'plan' | 'ask' | 'debug' | 'review'
/** Agent 模式 = 内置模式 | 自定义模式 slug */
export type AgentMode = BuiltinMode | string

/* ===== 会话状态 ===== */
export type SessionStatus = 'active' | 'idle' | 'error' | 'completed'

/* ===== 消息角色 ===== */
export type MessageRole = 'user' | 'assistant' | 'system'

/* ===== 工具调用状态 ===== */
export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/* ===== 权限决策 ===== */
export type PermissionDecision = 'allow' | 'deny' | 'always-allow'

/* ===== 会话 ===== */
export interface KiloSession {
  id: string
  title: string
  forkedFrom?: string
  mode: AgentMode
  model: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
  workingDir: string
  messageCount: number
  tokenUsage?: TokenUsage
}

/* ===== 消息 ===== */
export interface KiloMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  timestamp: string
  toolCalls?: KiloToolCall[]
  metadata?: MessageMetadata
  /** 用户消息的文件附件 */
  attachments?: FileAttachment[]
}

/* ===== 消息元数据 ===== */
export interface MessageMetadata {
  model?: string
  mode?: AgentMode
  duration?: number
  tokenUsage?: TokenUsage
  cost?: number
  /** 标记为系统提示消息（如未连接提示），UI 可据此区分样式 */
  isSystemNotice?: boolean
}

/* ===== Token 用量 ===== */
export interface TokenUsage {
  input: number
  output: number
  cacheRead?: number
  cacheWrite?: number
  total: number
  cost?: number
}

/* ===== 工具调用 ===== */
export interface KiloToolCall {
  id: string
  name: string
  status: ToolCallStatus
  input: Record<string, unknown>
  output?: string
  error?: string
  duration?: number
}

/* ===== 模型信息 ===== */
export interface KiloModel {
  id: string
  name: string
  provider: string
  contextLength?: number
  supportsImages?: boolean
  supportsStreaming?: boolean
  costPer1kInput?: number
  costPer1kOutput?: number
}

/* ===== 模型提供商 ===== */
export interface KiloProvider {
  id: string
  name: string
  enabled: boolean
  apiKeySet: boolean
  models: KiloModel[]
}

/* ===== MCP 服务器 ===== */
export interface McpServer {
  id: string
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error'
  tools?: McpTool[]
}

/* ===== MCP 工具 ===== */
export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/* ===== 权限请求 ===== */
export interface PermissionRequest {
  id: string
  toolName: string
  input: Record<string, unknown>
  description: string
  timestamp: string
}

/* ===== 配置 ===== */
export interface KiloConfig {
  model: string
  mode: AgentMode
  autoModelStrategy?: 'efficient' | 'frontier' | 'balanced' | 'free'
  providers: KiloProvider[]
  mcpServers: McpServer[]
  customModes?: CustomMode[]
  rules?: string
  /** 规则文件列表（结构化） */
  ruleFiles?: RuleFile[]
}

/* ===== 规则系统 ===== */
/** 规则来源 */
export type RuleSource = 'global' | 'project' | 'workspace'
/** 规则文件 */
export interface RuleFile {
  /** 唯一标识 */
  id: string
  /** 规则名称/文件名 */
  name: string
  /** 规则内容 */
  content: string
  /** 来源：全局/项目/工作区 */
  source: RuleSource
  /** 是否启用 */
  enabled: boolean
  /** 文件路径（项目规则时为相对路径） */
  path?: string
  /** 描述 */
  description?: string
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/* ===== 自定义模式 ===== */
export interface CustomMode {
  slug: string
  name: string
  description: string
  systemPrompt: string
  tools: string[]
  /** 图标名称（lucide-react 图标 key），默认 'Bot' */
  icon?: string
}

/* ===== SSE 事件 ===== */
export type KiloEventType =
  | 'session.created'
  | 'session.updated'
  | 'session.deleted'
  | 'message.created'
  | 'message.updated'
  | 'message.chunk'
  | 'tool_call.created'
  | 'tool_call.updated'
  | 'permission.requested'
  | 'permission.resolved'
  | 'status.changed'
  | 'error'

export interface KiloEvent {
  type: KiloEventType
  sessionId?: string
  data: unknown
  timestamp: string
}

/* ===== 流式消息块 ===== */
export interface MessageChunk {
  sessionId: string
  messageId: string
  content: string
  isComplete: boolean
}

/* ===== 项目/工作区 ===== */
export interface KiloProject {
  name: string
  path: string
  gitBranch?: string
  hasIndex: boolean
  lastOpened: string
}

/* ===== 记忆库条目 ===== */
export interface MemoryEntry {
  id: string
  key: string
  value: string
  category: 'preference' | 'context' | 'decision' | 'fact'
  createdAt: string
  updatedAt: string
}

/* ===== 文件附件 ===== */
export interface FileAttachment {
  /** 文件名 */
  name: string
  /** MIME 类型 */
  mimeType: string
  /** 文件大小（字节） */
  size: number
  /** 文件内容：文本文件为原始文本，二进制文件为 Base64 编码 */
  content: string
  /** 是否为 Base64 编码的二进制内容 */
  isBase64: boolean
}

/* ===== 文件树节点 ===== */
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modifiedAt?: string
}

/* ===== 浏览器控制 ===== */

/** 浏览器页面快照（无障碍树） */
export interface BrowserSnapshot {
  /** 页面 URL */
  url: string
  /** 页面标题 */
  title: string
  /** 无障碍树快照（用于 AI 理解页面结构） */
  accessibilityTree: string
  /** 截图（Base64 编码 PNG） */
  screenshot?: string
  /** 页面元信息 */
  meta?: {
    viewportWidth: number
    viewportHeight: number
    scrollX: number
    scrollY: number
  }
}

/** 浏览器操作类型 */
export type BrowserActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'screenshot'
  | 'snapshot'
  | 'wait'
  | 'select'
  | 'hover'
  | 'evaluate'
  | 'goBack'
  | 'goForward'
  | 'reload'

/** 浏览器操作请求 */
export interface BrowserAction {
  type: BrowserActionType
  /** 导航 URL（navigate 操作） */
  url?: string
  /** 元素选择器（click/type/select/hover 操作） */
  selector?: string
  /** 输入文本（type 操作） */
  text?: string
  /** 滚动方向和距离（scroll 操作） */
  scrollDirection?: 'up' | 'down' | 'left' | 'right'
  scrollAmount?: number
  /** 下拉选项值（select 操作） */
  optionValue?: string
  /** JavaScript 表达式（evaluate 操作） */
  expression?: string
  /** 等待时间 ms（wait 操作） */
  waitMs?: number
}

/** 浏览器操作结果 */
export interface BrowserActionResult {
  success: boolean
  /** 操作后的页面快照 */
  snapshot?: BrowserSnapshot
  /** evaluate 操作的返回值 */
  result?: unknown
  /** 错误信息 */
  error?: string
}

/** 浏览器控制状态 */
export interface BrowserState {
  /** 是否已启动浏览器 */
  launched: boolean
  /** 当前页面 URL */
  currentUrl: string
  /** 当前页面标题 */
  pageTitle: string
  /** 最新截图（Base64） */
  screenshot: string | null
  /** 最新无障碍快照 */
  accessibilityTree: string | null
  /** 浏览器历史记录 */
  history: string[]
  /** 历史记录当前位置索引 */
  historyIndex: number
  /** 是否正在执行操作 */
  isActing: boolean
  /** 错误信息 */
  error: string | null
}

/* ===== 窗口 API 类型声明 ===== */
declare global {
  interface Window {
    api: {
      kilo: {
        getPort: () => Promise<number>
        isReady: () => Promise<boolean>
        restart: () => Promise<number>
      }
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        onMaximizeChange: (callback: (maximized: boolean) => void) => void
      }
      fs: {
        selectDirectory: () => Promise<string | null>
        readFile: (filePath: string) => Promise<string>
        writeFile: (filePath: string, content: string) => Promise<void>
      }
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export {}
