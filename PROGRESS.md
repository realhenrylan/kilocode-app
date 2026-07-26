# KiloCode Desktop — 进度与交接文档

> 最后更新：2026-07-25 | 当前版本：v0.8.0-dev

---

## 一、项目目标

构建 **KiloCode Windows 桌面端应用程序**，硬性要求：
1. 包含 KiloCode 所有功能（500+ 模型、5+ Agent 模式、聊天、代码生成、终端、浏览器控制、MCP、索引、记忆库、会话分叉、PDF 上传、语音输入、自动恢复、权限、Diff、文件浏览、会话管理、项目/工作区、配置管理、自定义模式、规则系统等）
2. 前端设计完全参考 OpenAI Codex 桌面端
3. 融入 KiloCode 品牌黄 (#FFD700)，支持深色/浅色/跟随系统主题

---

## 二、当前构建状态

| 检查项 | 状态 | 说明 |
|--------|------|------|
| TypeScript 类型检查 | ✅ 通过 | `npx tsc --noEmit` 零错误 |
| Vite 生产构建 | ✅ 通过 | client 568KB / main 8.5KB / preload 2.3KB |
| Electron 桌面运行 | ✅ 已验证 | 7 项检查清单全部通过（窗口/标题栏/托盘/CLI降级/主题/尺寸/快捷键） |
| 单元测试 | ❌ 无 | 未建立测试框架 |

---

## 三、已完成功能清单（按版本）

### v0.1.0 — 项目脚手架
- Electron + React + TypeScript + Vite 项目初始化
- 自定义 frameless 标题栏
- 基础布局（Sidebar + MainPanel + RightPanel + StatusBar）
- CSS 变量主题系统（深色/浅色/跟随系统）
- KiloCode 品牌色集成

### v0.2.0 — 核心交互
- Composer 输入组件（多行、@引用、/斜杠命令）
- ChatPanel 对话面板（消息流、空状态欢迎页）
- AssistantMessage（Markdown 渲染 + 代码高亮 + 流式光标）
- UserMessage（用户消息展示）
- ToolCallCard（工具调用卡片）
- PermissionDialog（权限请求弹窗）
- sessionStore（会话/消息/流式状态管理）
- kiloClient（REST API 客户端，40+ 方法）
- eventStream（SSE 事件流）
- simulateReply（模拟 AI 回复，5 种模式模板）

### v0.3.0 — 浏览器控制 + 终端 + Diff
- BrowserPanel（导航/截图/交互/滚动/A11Y树/JS控制台）
- browserStore（完整浏览器状态管理 + 模拟模式）
- TerminalPanel（@xterm/xterm 集成终端）
- DiffViewer（统一 Diff 视图 + 语法高亮）
- FileTree（文件树浏览器）
- 右侧面板 tab 切换（Terminal/Diff/Browser/Files/Memory）

### v0.4.0 — 数据加载 + 记忆库
- memoryStore + MemoryBank（CRUD + 搜索 + 分类过滤）
- ModelSelector 重写（56 模型/12 提供商，分组搜索）
- useKiloConnection 首次连接自动加载（并行 Promise.allSettled）
- App.tsx 启动时加载模拟数据
- configStore 降级策略（未连接时用模拟数据）

### v0.5.0 — Token 追踪 + 权限 + MCP + 500+ 模型
- tokenUsageStore（会话/全局 Token 用量追踪）
- StatusBar Token 显示（品牌黄高亮）
- AssistantMessage 元数据（Token/费用/耗时）
- mockModels 扩展至 629 模型/22 提供商
- SettingsPanel 权限设置（默认策略 + 逐工具权限）
- SettingsPanel MCP 服务器管理（CRUD + 启用/禁用）
- IndexStatus 组件 + indexStore
- Composer 文件上传（MIME 推断 + Base64 编码 + 附件预览）
- useInlineCompletion（Ghost text + Tab/Esc）
- useVoiceInput（Web Speech API）

### v0.6.0 — 自定义模式
- AgentMode 类型扩展（BuiltinMode | string）
- CustomMode 接口（slug/name/description/systemPrompt/tools/icon）
- configStore customModes CRUD（乐观更新 + API 同步）
- CustomModesSection 设置面板（创建/编辑/删除/图标/工具选择）
- ModeSelector 重写（5 内置 + 自定义下拉菜单）
- Composer 斜杠命令支持自定义模式（/slug 格式）
- simulateReply 支持自定义模式
- 2 个模拟自定义模式（Architect, Mentor）

### v0.7.0 — 规则系统 + 自动恢复（部分）
- RuleFile/RuleSource 类型定义
- rulesStore（CRUD + 来源过滤 + API 同步）
- RulesSection 设置面板（来源过滤/启用禁用/Markdown 编辑器）
- 5 条模拟规则（全局2/项目2/工作区1）
- sessionStore persist 中间件（localStorage 持久化会话/消息/模式/模型）
- tokenUsageStore persist 中间件（持久化历史总量）
- Electron main.ts 崩溃恢复（renderer crashed 自动 reload + unresponsive 监听）

---

## 四、未完成功能清单

### 🔴 高优先级（核心功能缺失）

#### 1. 会话分叉 UI
- **状态**：✅ 已完成 — hover 分叉按钮 + `/fork` 斜杠命令 + 本地模拟分叉
- **需要**：
  - 消息 hover 显示分叉按钮（GitBranch 图标）
  - 点击调用 `forkSession(sessionId, messageId)`
  - 未连接时本地模拟分叉
  - `/fork` 斜杠命令绑定
- **涉及文件**：`AssistantMessage.tsx`、`UserMessage.tsx`、`Composer.tsx`
- **预估工作量**：2-3 小时

#### 2. 自动恢复完善
- **状态**：✅ 已完成 — resumeSession 接入 + wasInterrupted 检测 + Toast 提示
- **需要**：
  - `useKiloConnection` 连接成功后检查 `activeSessionId`，调用 `kiloApi.resumeSession(id)`
  - 窗口状态持久化（大小/位置保存到 localStorage，启动时恢复）
  - 中断提示（恢复后显示「上次会话中断」toast）
- **涉及文件**：`useKiloConnection.ts`、`electron/main.ts`、新增 toast 组件
- **预估工作量**：2-3 小时

#### 3. Electron 桌面运行时验证
- **状态**：✅ 已完成 — 7 项检查清单全部通过
- **修复的问题**：
  - ESM `__dirname` 不可用 → 添加 `fileURLToPath(import.meta.url)` 兼容
  - preload 路径错误 → `../preload/index.js` 改为 `preload.js`
  - KiloProcess CLI 启动失败 → 优雅降级到 mock 模式
  - 窗口关闭逻辑 → 添加 `isQuitting` 标志
  - dev server URL 传递 → 支持 `VITE_DEV_SERVER_URL` + fallback
  - vite-plugin-electron 自动启动冲突 → `ELECTRON_STARTUP_PREVENT` + 自定义启动脚本
- **验证结果**：
  1. ✅ 窗口正常显示（标题 "KiloCode"）
  2. ✅ 自定义标题栏（最小化/最大化/关闭按钮）
  3. ✅ 系统托盘图标和上下文菜单
  4. ✅ CLI 子进程优雅降级（mock 模式）
  5. ✅ 主题切换（dark/light/system）
  6. ✅ 窗口大小/位置（1414×909，默认 1400×900）
  7. ✅ 键盘快捷键（Ctrl+Shift+K/N/B/J/,）

### 🟡 中优先级（功能增强）

#### 4. PDF 上传支持
- **状态**：类型支持（FileAttachment），**无专门 PDF 处理**
- **需要**：
  - 集成 `pdf.js` 提取 PDF 文本
  - Composer 识别 PDF MIME
  - 大文件分块处理
  - PDF 附件标签 UI
- **预估工作量**：3-4 小时

#### 5. 模型参数配置 UI
- **状态**：SettingsPanel ModelsSection 仅显示提示文字
- **需要**：
  - 温度/Top-P/最大 Token 滑块
  - Auto Model 策略选择器
  - 默认模型设置
- **预估工作量**：2-3 小时

### 🟢 低优先级（体验优化）

#### 6. 窗口状态持久化
- 保存/恢复窗口大小和位置
- 预估：1 小时

#### 7. 代码分割优化
- 当前 index.js 568KB 超过 500KB 警告阈值
- 使用 dynamic import() 拆分 SettingsPanel、BrowserPanel、TerminalPanel
- 预估：2 小时

#### 8. 单元测试框架
- 配置 Vitest
- 为 stores 和 hooks 编写基础测试
- 预估：4-6 小时

---

## 五、关键代码位置索引

### 5.1 状态管理

| Store | 文件 | 持久化 | 关键状态 |
|-------|------|--------|----------|
| sessionStore | `src/stores/sessionStore.ts` | ✅ `kilocode-session` | sessions, activeSessionId, messages, currentMode, currentModel, streamingContent, isStreaming |
| configStore | `src/stores/configStore.ts` | ❌ | config, models(629), providers(22), mcpServers, customModes |
| connectionStore | `src/stores/connectionStore.ts` | ❌ | connected, port, error, reconnecting |
| uiStore | `src/stores/uiStore.ts` | ✅ `kilocode-ui` | theme, sidebarCollapsed, rightPanelVisible, rightPanelTab |
| browserStore | `src/stores/browserStore.ts` | ❌ | launched, currentUrl, screenshot, accessibilityTree, history |
| memoryStore | `src/stores/memoryStore.ts` | ❌ | entries, loaded |
| indexStore | `src/stores/indexStore.ts` | ❌ | status, fileCount, lastIndexed, isBuilding |
| tokenUsageStore | `src/stores/tokenUsageStore.ts` | ✅ `kilocode-token-usage` | usage, totalUsage, sessionCount |
| rulesStore | `src/stores/rulesStore.ts` | ❌ | rules, loaded |

### 5.2 核心交互流程

```
用户输入 → Composer.sendMessage()
  → sessionStore.sendMessage(content, attachments)
    → kiloApi.promptStream(sessionId, content, { mode, model, fileIds })
      → fetch POST /session/:id/prompt (SSE)
        → ReadableStream 逐块解析
          → onChunk: appendStreamingContent
          → onToolCall: addToolCall / updateToolCall
          → onMessageComplete: 添加完整消息 + recordUsage
          → onError: set isStreaming=false
    → 或 simulateReply(content, mode) [未连接时]
```

### 5.3 连接与数据加载流程

```
App.mount
  → useKiloConnection()
    → connect() [自动重试最多10次，5秒间隔]
    → 首次连接成功:
      → Promise.allSettled([
          loadConfig(), loadModels(), loadProviders(),
          loadMcpServers(), loadSessions(), loadIndexStatus()
        ])
  → App.tsx useEffect [无条件]
    → loadModels() [模拟数据]
    → loadProviders() [模拟数据]
    → loadCustomModes() [2个示例]
    → loadEntries() [5条记忆]
    → loadRules() [5条规则]
```

### 5.4 主题切换流程

```
uiStore.setTheme('dark'|'light'|'system')
  → localStorage persist
  → useTheme hook 监听变化
    → document.documentElement.setAttribute('data-theme', resolvedTheme)
    → 监听 window.matchMedia('(prefers-color-scheme: dark)') 变化
```

---

## 六、已知问题与注意事项

### 6.1 构建警告
- `index.js` chunk 568KB 超过 500KB 建议阈值，需代码分割优化

### 6.2 循环依赖风险
- `sessionStore` 导入了 `configStore`（simulateReply 中读取 customModes）
- `configStore` 不依赖 `sessionStore`，方向正确
- 需注意未来新增 store 间依赖时避免循环

### 6.3 模拟数据一致性
- 模拟数据在多个 store 中独立定义，与 API 返回格式需保持一致
- 连接 CLI 后真实数据会覆盖模拟数据，但切换过程可能有闪烁

### 6.4 persist 中间件注意
- `sessionStore` 的 `merge` 函数强制重置流式状态，避免恢复残留
- `tokenUsageStore` 只持久化 `totalUsage` 和 `sessionCount`，当前会话用量每次重置
- localStorage 容量限制约 5MB，大量消息历史可能超限，需考虑清理策略

### 6.5 Electron 安全
- `contextIsolation: true` + `nodeIntegration: false` ✅
- `sandbox: false` — 预加载脚本需要 Node.js API，后续可考虑迁移到 sandbox 模式
- `webContents.setWindowOpenHandler` 拦截外部链接 ✅

---

## 七、交接检查清单

### 接手开发者需要了解的

- [ ] 阅读 `SPEC.md` 了解完整架构和功能规格
- [ ] 阅读 `CHANGELOG.md` 了解各版本变更
- [ ] 运行 `npm install` 安装依赖
- [ ] 运行 `npx tsc --noEmit` 确认类型检查通过
- [ ] 运行 `npx vite build` 确认构建通过
- [ ] 尝试 `npm run electron:dev` 验证桌面运行

### 继续开发优先级建议

1. **PDF 上传** — 功能补全
2. **模型参数配置 UI** — 功能增强
3. **窗口状态持久化** — 体验优化
4. **代码分割 + 测试** — 质量提升

### 开发环境注意事项

- Windows + Git Bash 环境
- Node.js 18+，npm 9+
- Vite dev server 端口默认 5173
- Electron 开发模式使用 `npm run electron:dev`（自定义启动脚本，显式传递 VITE_DEV_SERVER_URL）
- 未安装 KiloCode CLI 时应用以模拟模式运行（所有 UI 可交互）
- `package.json` 设置 `"type": "module"`，Electron 主进程需使用 `fileURLToPath(import.meta.url)` 替代 `__dirname`

---

## 八、版本规划建议

| 版本 | 目标 | 预估 |
|------|------|------|
| v0.8.0 | ✅ 已完成：会话分叉 UI + 自动恢复完善 + 桌面验证 | 1 天 |
| v0.9.0 | PDF 上传 + 模型参数 UI + 窗口状态持久化 | 1 天 |
| v0.10.0 | 代码分割优化 + 单元测试框架 | 1 天 |
| v1.0.0 | 全面测试 + Bug 修复 + 文档完善 | 1-2 天 |
