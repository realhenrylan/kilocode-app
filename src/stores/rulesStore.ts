import { create } from 'zustand'
import type { RuleFile, RuleSource } from '@/types/kilo'
import { useConnectionStore } from '@/stores/connectionStore'
import { kiloApi } from '@/services/kiloClient'

/**
 * 规则状态管理
 *
 * 管理 KiloCode 规则文件（全局规则、项目规则、工作区规则）
 * 规则文件对应 .kilocode/rules/ 目录下的 Markdown 文件
 * 全局规则存储在用户配置目录
 */

/** 模拟规则数据 */
const MOCK_RULES: RuleFile[] = [
  {
    id: 'rule-global-1',
    name: 'coding-style',
    content: '# 编码风格规范\n\n- 使用 TypeScript 严格模式\n- 优先使用函数式组件和 hooks\n- 变量命名使用 camelCase，类型/接口使用 PascalCase\n- 每个函数只做一件事（单一职责原则）\n- 注释应解释「为什么」而非「做什么」',
    source: 'global',
    enabled: true,
    description: '全局编码风格规范',
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-24T08:30:00Z',
  },
  {
    id: 'rule-global-2',
    name: 'security',
    content: '# 安全规则\n\n- 严禁在代码中硬编码 API Key、密码等敏感信息\n- 所有用户输入必须经过验证和清理\n- API 调用必须设置超时\n- 文件操作必须限制在工作目录内',
    source: 'global',
    enabled: true,
    description: '安全开发规则',
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-22T14:00:00Z',
  },
  {
    id: 'rule-project-1',
    name: 'project-architecture',
    content: '# 项目架构规则\n\n- 组件放在 src/components/ 目录\n- 状态管理使用 Zustand，store 放在 src/stores/\n- API 客户端放在 src/services/\n- 类型定义放在 src/types/\n- 工具函数放在 src/utils/',
    source: 'project',
    enabled: true,
    path: '.kilocode/rules/project-architecture.md',
    description: '项目目录结构规范',
    createdAt: '2026-07-22T09:00:00Z',
    updatedAt: '2026-07-24T10:00:00Z',
  },
  {
    id: 'rule-project-2',
    name: 'testing',
    content: '# 测试规则\n\n- 新功能必须编写测试\n- 测试文件放在 __tests__/ 目录\n- 使用 Vitest 作为测试框架\n- 一个测试只验证一个行为\n- 测试名要描述预期行为',
    source: 'project',
    enabled: true,
    path: '.kilocode/rules/testing.md',
    description: '测试编写规范',
    createdAt: '2026-07-23T11:00:00Z',
    updatedAt: '2026-07-23T11:00:00Z',
  },
  {
    id: 'rule-workspace-1',
    name: 'commit-convention',
    content: '# 提交规范\n\n- 使用 Conventional Commits 格式\n- feat: 新功能\n- fix: 修复 bug\n- docs: 文档更新\n- refactor: 重构\n- test: 测试相关\n- chore: 构建/工具变更',
    source: 'workspace',
    enabled: false,
    path: '.kilocode/rules/commit-convention.md',
    description: 'Git 提交信息规范',
    createdAt: '2026-07-24T09:00:00Z',
    updatedAt: '2026-07-24T09:00:00Z',
  },
]

interface RulesState {
  /** 规则文件列表 */
  rules: RuleFile[]
  /** 是否已加载 */
  loaded: boolean

  /** 加载规则列表 */
  loadRules: () => void
  /** 添加规则 */
  addRule: (rule: Omit<RuleFile, 'id' | 'createdAt' | 'updatedAt'>) => void
  /** 更新规则 */
  updateRule: (id: string, updates: Partial<RuleFile>) => void
  /** 删除规则 */
  removeRule: (id: string) => void
  /** 切换规则启用状态 */
  toggleRule: (id: string) => void
  /** 按来源过滤规则 */
  getRulesBySource: (source: RuleSource) => RuleFile[]
}

export const useRulesStore = create<RulesState>()((set, get) => ({
  rules: [],
  loaded: false,

  /** 加载规则列表 */
  loadRules: () => {
    const connected = useConnectionStore.getState().connected

    if (connected) {
      // 连接时从 API 加载
      kiloApi.getConfig()
        .then((config) => {
          if (config.ruleFiles && config.ruleFiles.length > 0) {
            set({ rules: config.ruleFiles, loaded: true })
          } else {
            set({ rules: MOCK_RULES, loaded: true })
          }
        })
        .catch(() => {
          set({ rules: MOCK_RULES, loaded: true })
        })
    } else {
      // 未连接时使用模拟数据
      set({ rules: MOCK_RULES, loaded: true })
    }
  },

  /** 添加规则 */
  addRule: (rule) => {
    const now = new Date().toISOString()
    const newRule: RuleFile = {
      ...rule,
      id: `rule-${rule.source}-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    const newRules = [...get().rules, newRule]
    set({ rules: newRules })

    // 同步到 API
    if (useConnectionStore.getState().connected) {
      kiloApi.updateConfig({ ruleFiles: newRules }).catch((err) => {
        console.error('[addRule] sync failed:', err)
      })
    }
  },

  /** 更新规则 */
  updateRule: (id, updates) => {
    const newRules = get().rules.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    )
    set({ rules: newRules })

    if (useConnectionStore.getState().connected) {
      kiloApi.updateConfig({ ruleFiles: newRules }).catch((err) => {
        console.error('[updateRule] sync failed:', err)
      })
    }
  },

  /** 删除规则 */
  removeRule: (id) => {
    const newRules = get().rules.filter((r) => r.id !== id)
    set({ rules: newRules })

    if (useConnectionStore.getState().connected) {
      kiloApi.updateConfig({ ruleFiles: newRules }).catch((err) => {
        console.error('[removeRule] sync failed:', err)
      })
    }
  },

  /** 切换规则启用状态 */
  toggleRule: (id) => {
    const rule = get().rules.find((r) => r.id === id)
    if (!rule) return
    get().updateRule(id, { enabled: !rule.enabled })
  },

  /** 按来源过滤规则 */
  getRulesBySource: (source) => {
    return get().rules.filter((r) => r.source === source)
  },
}))
