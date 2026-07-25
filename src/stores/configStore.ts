import { create } from 'zustand'
import type { KiloConfig, KiloProvider, KiloModel, McpServer, CustomMode } from '@/types/kilo'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'
import { MOCK_PROVIDERS, MOCK_MODELS } from '@/data/mockModels'

/**
 * 配置状态管理
 *
 * 管理 KiloCode 配置、模型列表、MCP 服务器等
 * 与 kiloClient API 真实对接
 */
interface ConfigState {
  /** KiloCode 配置 */
  config: KiloConfig | null
  /** 所有可用模型 */
  models: KiloModel[]
  /** 所有提供商 */
  providers: KiloProvider[]
  /** MCP 服务器列表 */
  mcpServers: McpServer[]
  /** 配置是否已加载 */
  loaded: boolean

  // 基础 Setters
  setConfig: (config: KiloConfig) => void
  setModels: (models: KiloModel[]) => void
  setProviders: (providers: KiloProvider[]) => void
  setMcpServers: (mcpServers: McpServer[]) => void
  setLoaded: (loaded: boolean) => void
  updateProvider: (id: string, updates: Partial<KiloProvider>) => void
  updateMcpServer: (id: string, updates: Partial<McpServer>) => void

  // API 集成 Actions
  /** 从 API 加载完整配置 */
  loadConfig: () => Promise<void>
  /** 更新配置（本地 + API） */
  saveConfig: (updates: Partial<KiloConfig>) => Promise<void>
  /** 加载模型列表 */
  loadModels: () => Promise<void>
  /** 加载提供商列表 */
  loadProviders: () => Promise<void>
  /** 加载 MCP 服务器列表 */
  loadMcpServers: () => Promise<void>
  /** 添加 MCP 服务器 */
  addMcpServer: (server: Omit<McpServer, 'id' | 'status'>) => Promise<void>
  /** 移除 MCP 服务器 */
  removeMcpServer: (id: string) => Promise<void>
  /** 切换 MCP 服务器启用状态 */
  toggleMcpServer: (id: string) => Promise<void>

  // 自定义模式 Actions
  /** 获取所有自定义模式 */
  customModes: CustomMode[]
  /** 加载自定义模式列表 */
  loadCustomModes: () => void
  /** 添加自定义模式 */
  addCustomMode: (mode: Omit<CustomMode, 'slug'>) => void
  /** 更新自定义模式 */
  updateCustomMode: (slug: string, updates: Partial<CustomMode>) => void
  /** 删除自定义模式 */
  removeCustomMode: (slug: string) => void
}

export const useConfigStore = create<ConfigState>()((set, get) => ({
  config: null,
  models: [],
  providers: [],
  mcpServers: [],
  loaded: false,
  customModes: [],

  // 基础 Setters
  setConfig: (config) => set({ config, loaded: true }),
  setModels: (models) => set({ models }),
  setProviders: (providers) => set({ providers }),
  setMcpServers: (mcpServers) => set({ mcpServers }),
  setLoaded: (loaded) => set({ loaded }),
  updateProvider: (id, updates) => set((s) => ({
    providers: s.providers.map((p) => p.id === id ? { ...p, ...updates } : p),
  })),
  updateMcpServer: (id, updates) => set((s) => ({
    mcpServers: s.mcpServers.map((m) => m.id === id ? { ...m, ...updates } : m),
  })),

  // ===== API 集成 =====

  /** 从 API 加载完整配置 */
  loadConfig: async () => {
    const connected = useConnectionStore.getState().connected
    if (!connected) return

    try {
      const config = await kiloApi.getConfig()
      set({
        config,
        models: config.providers?.flatMap((p) => p.models) || [],
        providers: config.providers || [],
        mcpServers: config.mcpServers || [],
        customModes: config.customModes || [],
        loaded: true,
      })
    } catch (err) {
      console.error('[loadConfig] Failed:', err)
    }
  },

  /** 更新配置（本地 + API） */
  saveConfig: async (updates: Partial<KiloConfig>) => {
    const connected = useConnectionStore.getState().connected

    // 乐观更新本地状态
    if (get().config) {
      set((s) => ({
        config: { ...s.config!, ...updates },
      }))
    }

    if (connected) {
      try {
        const newConfig = await kiloApi.updateConfig(updates)
        set({ config: newConfig })
      } catch (err) {
        console.error('[saveConfig] Failed:', err)
        // 回滚：重新加载配置
        await get().loadConfig()
      }
    }
  },

  /** 加载模型列表 */
  loadModels: async () => {
    const connected = useConnectionStore.getState().connected

    if (connected) {
      try {
        const models = await kiloApi.listModels()
        set({ models })
        return
      } catch (err) {
        console.error('[loadModels] API failed, using mock data:', err)
      }
    }

    // 未连接或 API 失败时使用模拟数据
    set({ models: MOCK_MODELS })
  },

  /** 加载提供商列表 */
  loadProviders: async () => {
    const connected = useConnectionStore.getState().connected

    if (connected) {
      try {
        const providers = await kiloApi.listProviders()
        set({ providers })
        return
      } catch (err) {
        console.error('[loadProviders] API failed, using mock data:', err)
      }
    }

    // 未连接或 API 失败时使用模拟数据
    set({ providers: MOCK_PROVIDERS })
  },

  /** 加载 MCP 服务器列表 */
  loadMcpServers: async () => {
    const connected = useConnectionStore.getState().connected
    if (!connected) return

    try {
      const servers = await kiloApi.listMcpServers()
      set({ mcpServers: servers })
    } catch (err) {
      console.error('[loadMcpServers] Failed:', err)
    }
  },

  /** 添加 MCP 服务器 */
  addMcpServer: async (server) => {
    const connected = useConnectionStore.getState().connected

    if (connected) {
      try {
        const newServer = await kiloApi.addMcpServer({
          name: server.name,
          command: server.command,
          args: server.args,
          env: server.env,
          enabled: server.enabled,
        })
        set((s) => ({
          mcpServers: [...s.mcpServers, newServer],
        }))
        return
      } catch (err) {
        console.error('[addMcpServer] API failed, falling back to local:', err)
      }
    }

    // 降级：本地添加
    const localServer: McpServer = {
      id: `mcp-local-${Date.now()}`,
      name: server.name,
      command: server.command,
      args: server.args,
      env: server.env,
      enabled: server.enabled,
      status: 'disconnected',
    }
    set((s) => ({
      mcpServers: [...s.mcpServers, localServer],
    }))
  },

  /** 移除 MCP 服务器 */
  removeMcpServer: async (id: string) => {
    const connected = useConnectionStore.getState().connected

    // 乐观删除
    set((s) => ({
      mcpServers: s.mcpServers.filter((m) => m.id !== id),
    }))

    if (connected) {
      try {
        await kiloApi.removeMcpServer(id)
      } catch (err) {
        console.error('[removeMcpServer] API failed, restoring:', err)
        // 回滚：重新加载
        await get().loadMcpServers()
      }
    }
  },

  /** 切换 MCP 服务器启用状态 */
  toggleMcpServer: async (id: string) => {
    const server = get().mcpServers.find((m) => m.id === id)
    if (!server) return

    const newEnabled = !server.enabled

    // 乐观更新
    set((s) => ({
      mcpServers: s.mcpServers.map((m) =>
        m.id === id ? { ...m, enabled: newEnabled } : m
      ),
    }))

    // API 更新（通过 saveConfig）
    const connected = useConnectionStore.getState().connected
    if (connected) {
      try {
        await kiloApi.updateConfig({
          mcpServers: get().mcpServers,
        } as Partial<KiloConfig>)
      } catch (err) {
        console.error('[toggleMcpServer] Failed:', err)
        // 回滚
        set((s) => ({
          mcpServers: s.mcpServers.map((m) =>
            m.id === id ? { ...m, enabled: !newEnabled } : m
          ),
        }))
      }
    }
  },

  // ===== 自定义模式 =====

  /** 加载自定义模式列表（从 config 或模拟数据） */
  loadCustomModes: () => {
    const { config } = get()
    if (config?.customModes && config.customModes.length > 0) {
      set({ customModes: config.customModes })
    } else {
      // 模拟数据：2 个示例自定义模式
      set({
        customModes: [
          {
            slug: 'architect',
            name: 'Architect',
            description: '专注于系统架构设计和技术方案评审',
            systemPrompt: '你是一位资深架构师，专注于系统架构设计、技术选型和方案评审。你的回复应该包含架构图描述、技术权衡分析和实施建议。',
            tools: ['read_file', 'list_directory', 'search'],
            icon: 'Building2',
          },
          {
            slug: 'mentor',
            name: 'Mentor',
            description: '教学辅导模式，耐心解释概念和代码',
            systemPrompt: '你是一位耐心的编程导师，擅长用简单易懂的方式解释复杂概念。你的回复应该包含逐步解释、代码示例和练习建议。不要直接给出完整答案，而是引导学习者思考。',
            tools: ['read_file', 'list_directory'],
            icon: 'GraduationCap',
          },
        ],
      })
    }
  },

  /** 添加自定义模式 */
  addCustomMode: (mode) => {
    // 生成 slug：名称转小写 + 连字符
    const slug = mode.name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-|-$/g, '')
      || `custom-${Date.now()}`

    const newMode: CustomMode = { ...mode, slug }
    const newModes = [...get().customModes, newMode]

    set({ customModes: newModes })

    // 同步到 config
    const connected = useConnectionStore.getState().connected
    if (connected) {
      get().saveConfig({ customModes: newModes }).catch((err) => {
        console.error('[addCustomMode] saveConfig failed:', err)
      })
    }
  },

  /** 更新自定义模式 */
  updateCustomMode: (slug, updates) => {
    const newModes = get().customModes.map((m) =>
      m.slug === slug ? { ...m, ...updates } : m
    )
    set({ customModes: newModes })

    const connected = useConnectionStore.getState().connected
    if (connected) {
      get().saveConfig({ customModes: newModes }).catch((err) => {
        console.error('[updateCustomMode] saveConfig failed:', err)
      })
    }
  },

  /** 删除自定义模式 */
  removeCustomMode: (slug) => {
    const newModes = get().customModes.filter((m) => m.slug !== slug)
    set({ customModes: newModes })

    const connected = useConnectionStore.getState().connected
    if (connected) {
      get().saveConfig({ customModes: newModes }).catch((err) => {
        console.error('[removeCustomMode] saveConfig failed:', err)
      })
    }
  },
}))
