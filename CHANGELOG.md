# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.7.0] - 2026-07-24

### Added
- **规则系统（Rules System）完整实现**：
  - 类型定义：`RuleFile` 接口（id、name、content、source、enabled、path、description、时间戳），`RuleSource` 类型（global/project/workspace），`KiloConfig.ruleFiles` 字段
  - `rulesStore` 完整实现：loadRules、addRule、updateRule、removeRule、toggleRule、getRulesBySource，API 同步 + 模拟数据降级
  - 5 条模拟规则数据：全局编码风格/安全规则、项目架构/测试规则、工作区提交规范
  - `RulesSection` 设置面板组件：按来源过滤（全部/全局/项目/工作区）、启用/禁用切换、创建/编辑/删除规则、Markdown 内容编辑器、来源选择器、路径自动生成
  - 设置面板新增「规则」导航项（ScrollText 图标）
  - App 启动时自动加载规则模拟数据

## [0.6.0] - 2026-07-24

### Added
- **自定义模式（Custom Modes）完整实现**：
  - 类型扩展：`AgentMode` 从封闭联合类型扩展为 `BuiltinMode | string`，支持自定义模式 slug
  - `CustomMode` 接口新增 `icon` 字段（lucide-react 图标 key）
  - configStore 新增 `customModes` 状态和 CRUD actions（`loadCustomModes`、`addCustomMode`、`updateCustomMode`、`removeCustomMode`），乐观更新 + API 同步
  - `CustomModesSection` 设置面板组件：创建/编辑/删除自定义模式，配置名称、描述、系统提示词、图标、可用工具列表
  - `ModeSelector` 重写：5 个内置模式按钮 + 自定义模式下拉菜单，当前自定义模式高亮显示
  - Composer 斜杠命令支持自定义模式（`/slug` 格式切换），命令列表动态分组（模式切换/自定义模式/通用命令）
  - `simulateReply` 支持自定义模式模拟回复，自动读取模式名称和描述
  - App 启动时自动加载自定义模式模拟数据（2 个示例：Architect、Mentor）
- 设置面板新增「自定义模式」导航项（Cog 图标）

## [0.5.0] - 2026-07-24

### Added
- **Token 用量与成本追踪**：tokenUsageStore 完整实现，记录会话和全局 Token 用量（inputTokens、outputTokens、totalTokens、cost），StatusBar 显示实时 Token 计数和费用（品牌黄色高亮），hover 显示详细分解
- **消息元数据显示**：AssistantMessage 底部显示 Token 用量（↑输入/↓输出）、费用（$）、耗时（ms/s），流式输出完成后自动展示
- **模拟 Token 记录**：simulateReply 完成后自动生成模拟 Token 用量（基于字符数估算，Claude Sonnet 定价），onMessageComplete 回调自动记录真实/模拟用量
- **500+ 模型数据**：mockModels 扩展至 629 个模型，覆盖 22 个提供商，包含日期快照变体和 Ollama 量化变体
- **权限设置 UI**：SettingsPanel 新增完整权限配置
  - 默认策略选择器：always-ask / auto-approve / deny 三级策略
  - 逐工具权限列表：11 个工具（read_file、write_file、execute_command、browser_navigate 等）
- **MCP 服务器管理 UI**：SettingsPanel 新增 MCP CRUD 操作（添加/删除/启用禁用切换），显示命令和参数
- **代码库索引状态**：indexStore + IndexStatus 组件，StatusBar 显示索引状态（已索引/未索引/构建中/错误）
- **文件上传支持**：Composer 支持拖拽/点击添加文件附件，自动推断 MIME 类型，文本文件直接读取、二进制文件 Base64 编码，附件预览标签（文件名/大小/类型/删除）
- **内联代码补全**：useInlineCompletion hook + Composer ghost text 层，Tab 接受/Esc 取消，连接时 API 补全、离线时本地关键词匹配
- **语音输入集成**：Composer 集成语音输入按钮

### Changed
- UserMessage 改为接收 message prop（KiloMessage），展示附件标签
- ChatPanel 传递 message prop 给 AssistantMessage 以支持元数据显示
- sessionStore onMessageComplete 回调增加 Token 用量记录逻辑
- simulateReply 增加模拟 Token 用量生成和记录

## [0.4.0] - 2026-07-24

### Added
- **MemoryBank 真实 API 集成**：memoryStore 完整实现（loadEntries、addEntry、removeEntry、searchEntries），与 kiloClient memory API 对接，未连接时使用模拟数据（5条示例记忆），MemoryBank 组件重写支持添加/删除/搜索/分类过滤
- **模型列表真实加载**：56个模拟模型覆盖12个提供商（Anthropic、OpenAI、Google、xAI、Mistral、DeepSeek、Meta、Cohere、Amazon Bedrock、Azure OpenAI、Ollama、Kilo Gateway），ModelSelector 重写支持按提供商分组、搜索过滤、模型特性标识（🖼图片/∞长上下文），底部统计显示模型和提供商数量
- **首次连接自动加载**：useKiloConnection hook 在连接成功后自动并行加载 config、models、providers、MCP servers、sessions、index status
- **App 初始化加载模拟数据**：未连接 CLI 时自动加载模拟模型和记忆数据，确保 UI 可交互
- **kiloClient 记忆 API**：新增 listMemory、addMemory、removeMemory、searchMemory 方法

### Changed
- configStore loadModels/loadProviders 在未连接时降级使用模拟数据而非跳过
- App.tsx 添加 useEffect 初始化模拟数据加载

## [0.3.0] - 2026-07-24

### Added
- **浏览器控制功能**：完整的内置浏览器控制面板
  - 页面导航：URL 输入栏 + 前进/后退/刷新按钮
  - 截图预览：实时页面截图显示区域
  - 元素交互：点击/输入/悬停三种模式，CSS 选择器定位元素
  - 滚动控制：上下滚动按钮
  - 无障碍树查看：展开查看页面 A11Y 树结构
  - JS 控制台：执行 JavaScript 表达式并查看返回值
  - 启动/关闭浏览器：一键启动内置浏览器实例
- **browserStore**：完整的浏览器状态管理（launched, currentUrl, pageTitle, screenshot, accessibilityTree, history, isActing, error），所有操作与 kiloClient browser API 真实对接，未连接 CLI 时提供模拟模式
- **kiloClient 浏览器 API**：新增 launchBrowser、closeBrowser、browserSnapshot、browserAction、browserActionSequence 方法
- **类型定义扩展**：新增 BrowserSnapshot、BrowserActionType、BrowserAction、BrowserActionResult、BrowserState 类型
- **右侧面板新增浏览器标签页**：RightPanel 新增 Globe 图标浏览器标签，uiStore rightPanelTab 类型扩展

## [0.2.0] - 2026-07-24

### Added
- **文件上传功能**：Composer 支持选择文件附件，自动读取文件内容（文本文件读取为字符串，二进制文件读取为 Base64），附件预览标签（显示文件名、大小、类型），发送时上传到 API 或嵌入消息内容
- **内联自动补全**：Composer 输入时提供 ghost text 补全建议，Tab 键接受补全，Esc 键取消补全；已连接 CLI 时调用 /completion API，未连接时使用本地关键词补全
- **代码库索引状态**：状态栏显示索引状态（已索引文件数/未索引/索引中/错误），点击可触发索引构建，模拟模式下展示进度动画
- **MCP 服务器 CRUD**：设置面板 MCP 部分完整重写，支持添加/删除/启用禁用 MCP 服务器，添加表单（名称、命令、参数），乐观更新 + API 失败回滚
- **kiloClient API 扩展**：新增 uploadFile、uploadBase64、inlineCompletion、getIndexStatus、triggerIndexing 方法
- **类型定义扩展**：新增 FileAttachment 类型，KiloMessage 增加 attachments 字段

### Changed
- `sendMessage` 签名扩展为 `(content, attachments?)` 支持文件附件参数
- `promptStream` 回调接口增加 `fileIds` 参数支持
- UserMessage 组件从 `content` prop 改为 `message` prop，支持展示附件标签
- configStore 完整重写，新增 loadConfig、saveConfig、loadModels、loadProviders、loadMcpServers、addMcpServer、removeMcpServer、toggleMcpServer 等 API 集成 actions
- Composer 附件按钮从动态创建 input 改为 ref 引用隐藏 input，支持图片文件选择

## [0.1.0] - 2026-07-24

### Added
- 项目初始化：Electron + Vite + React + TypeScript 脚手架
- 双主题系统：深色(Dark)/浅色(Light)/跟随系统(System) 三种模式
- KiloCode 品牌黄色(#FFD700)融入色彩系统
- Codex 风格 UI 布局：三栏式（侧边栏 + 主面板 + 右侧面板）
- 自定义标题栏（无边框窗口 + 窗口控制按钮）
- 侧边栏组件：Logo、会话列表、模式选择器、模型选择器、项目选择器、主题切换
- 对话组件：ChatPanel、UserMessage、AssistantMessage、ToolCallCard、StreamingIndicator
- Composer 输入组件：多行输入、@文件引用、/斜杠命令、附件、语音输入
- Diff 查看器组件
- 终端面板组件（xterm.js）
- 文件树组件
- 记忆库组件（MemoryBank）
- 权限弹窗组件
- 设置面板：API 密钥、外观、模型、MCP 服务器、权限、快捷键
- 状态栏：连接状态、模式、模型信息
- KiloCode CLI 子进程管理器（kilo serve）
- IPC Bridge（主进程↔渲染进程通信）
- KiloCode API 客户端（HTTP REST + SSE 事件流）
- Zustand 状态管理：uiStore、sessionStore、configStore、connectionStore
- 系统托盘（最小化到托盘、托盘菜单）
- 全局快捷键（Ctrl+Shift+K 显示/隐藏窗口）
- 应用内快捷键（Ctrl+N/B/J/,）
- 语音输入 Hook（Web Speech API）
- 自动更新模块（electron-updater）
- electron-builder Windows 打包配置
- 浏览器预览模式兼容（window.api 安全检查）
