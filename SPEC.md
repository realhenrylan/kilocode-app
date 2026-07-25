# KiloCode Desktop — 项目规格文档 (SPEC)

> 版本：v0.7.0-dev | 日期：2026-07-24 | 状态：开发中

---

## 一、项目目标

构建一个 **KiloCode Windows 桌面端应用程序**，硬性要求：

1. **包含 KiloCode 所有功能** — 500+ 模型、5+ Agent 模式、聊天、代码生成、终端、浏览器控制、MCP、索引、记忆库、会话分叉、PDF 上传、语音输入、自动恢复、权限、Diff 查看、文件浏览、会话管理、项目/工作区、配置管理、自定义模式、规则系统等
2. **前端设计完全参考 OpenAI Codex 桌面端** — 简洁、深色为主、左对话右工具面板布局
3. **融入 KiloCode 品牌色** — 专属黄 (#FFD700) 作为品牌标识色，Cyan (#00bcd4) 作为交互反馈色
4. **支持深色/浅色/跟随系统** 三种主题模式

---

## 二、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | 33+ |
| 前端框架 | React + TypeScript | React 19, TS 5.x |
| UI 组件 | Radix UI + Tailwind CSS | Tailwind v4 |
| 状态管理 | Zustand (含 persist 中间件) | 5.x |
| 代码高亮 | Shiki | 4.x |
| 终端 | @xterm/xterm | 6.x |
| Markdown | react-markdown + remark-gfm | 10.x |
| 构建工具 | Vite + electron-builder | Vite 8.x |
| 后端通信 | HTTP REST + SSE + WebSocket | — |

---

## 三、架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   Electron Main Process              │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ main.ts  │  │ kilo-process │  │ ipc-handlers  │  │
│  │ (窗口管理)│  │ (CLI 子进程) │  │ (IPC 通信)    │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ tray.ts  │  │ shortcuts.ts │  │ auto-updater  │  │
│  │ (系统托盘)│  │ (全局快捷键) │  │ (自动更新)    │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────┤
│                   Preload (contextBridge)             │
│  window.api.kilo / window.api.window / window.api.fs │
├─────────────────────────────────────────────────────┤
│                   Renderer (React)                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │                    AppShell                       │ │
│  │  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ │ │
│  │  │ Sidebar  │ │  MainPanel   │ │  RightPanel  │ │ │
│  │  │          │ │              │ │              │ │ │
│  │  │ ModeSel  │ │  ChatPanel   │ │ Terminal     │ │ │
│  │  │ ModelSel │ │  Composer    │ │ DiffViewer   │ │ │
│  │  │ Sessions │ │              │ │ BrowserPanel │ │ │
│  │  │ Project  │ │              │ │ FileTree     │ │ │
│  │  │ Memory   │ │              │ │ MemoryBank   │ │ │
│  │  └──────────┘ └──────────────┘ └──────────────┘ │ │
│  │  ┌──────────────────────────────────────────────┐│ │
│  │  │              StatusBar                       ││ │
│  │  └──────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Zustand Stores (9个)                            │ │
│  │  session | config | connection | ui | browser    │ │
│  │  memory | index | tokenUsage | rules             │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Services                                        │ │
│  │  kiloClient (REST API) | eventStream (SSE)       │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↕ HTTP REST + SSE
┌─────────────────────────────────────────────────────┐
│              KiloCode CLI (kilo serve)                │
│              端口 4096+ (自动分配)                     │
└─────────────────────────────────────────────────────┘
```

### 3.2 通信架构

| 方向 | 协议 | 用途 |
|------|------|------|
| Renderer → CLI | HTTP REST (POST/PUT/GET) | 发送消息、管理会话、配置读写 |
| CLI → Renderer | SSE (text/event-stream) | 流式 AI 回复、工具调用更新、权限请求 |
| Renderer → Main | IPC (contextBridge) | 窗口控制、CLI 进程管理、文件系统 |
| Main → CLI | Child Process | 启动/停止/重启 `kilo serve` |

### 3.3 状态管理策略

| Store | 持久化 | 持久化键 | 说明 |
|-------|--------|----------|------|
| uiStore | ✅ localStorage | `kilocode-ui` | 主题、侧边栏、右面板状态 |
| sessionStore | ✅ localStorage | `kilocode-session` | 会话列表、消息、模式、模型（流式数据不持久化） |
| tokenUsageStore | ✅ localStorage | `kilocode-token-usage` | 历史总用量（当前会话用量不持久化） |
| configStore | ❌ | — | 从 API 加载，未连接时用模拟数据 |
| connectionStore | ❌ | — | 运行时连接状态 |
| browserStore | ❌ | — | 浏览器控制运行时状态 |
| memoryStore | ❌ | — | 从 API 加载，未连接时用模拟数据 |
| indexStore | ❌ | — | 索引状态运行时查询 |
| rulesStore | ❌ | — | 从 API 加载，未连接时用模拟数据 |

### 3.4 主题系统

- CSS 变量驱动，通过 `document.documentElement.setAttribute('data-theme', value)` 切换
- `data-theme="dark"` → 深色主题（默认）
- `data-theme="light"` → 浅色主题
- `data-theme` 跟随 `prefers-color-scheme` → 跟随系统
- 品牌色策略：
  - `--brand-primary: #FFD700` (KiloCode 黄) — Logo、激活高亮、发送按钮
  - `--accent: #00bcd4` (Cyan) — 链接、代码引用、进度条
  - 浅色模式下品牌黄加深至 `#B8960F` 保证对比度

---

## 四、功能清单与实现状态

### 4.1 核心功能

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 1 | 聊天对话 | ✅ 已完成 | ChatPanel + Composer，流式输出，Markdown 渲染 |
| 2 | 5 种 Agent 模式 | ✅ 已完成 | Code/Plan/Ask/Debug/Review，ModeSelector 切换 |
| 3 | 自定义模式 | ✅ 已完成 | CustomModesSection CRUD，ModeSelector 下拉，斜杠命令 |
| 4 | 模型选择 | ✅ 已完成 | 629 模型/22 提供商，按提供商分组搜索，特性标识 |
| 5 | 流式 AI 回复 | ✅ 已完成 | SSE + ReadableStream，逐字渲染 + 光标闪烁 |
| 6 | 模拟模式 | ✅ 已完成 | 未连接 CLI 时模拟回复，按模式生成不同内容 |
| 7 | 会话管理 | ✅ 已完成 | 创建/切换/删除会话，SessionList 侧边栏 |
| 8 | 会话分叉 | ⚠️ 部分完成 | API 方法已有 (forkSession)，UI 入口未实现 |
| 9 | 工具调用展示 | ✅ 已完成 | ToolCallCard 组件，状态标识 |
| 10 | 权限弹窗 | ✅ 已完成 | PermissionDialog，allow/deny/always-allow |

### 4.2 编辑器与终端

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 11 | 集成终端 | ✅ 已完成 | @xterm/xterm，TerminalPanel |
| 12 | Diff 查看 | ✅ 已完成 | DiffViewer，统一 Diff 视图 + 语法高亮 |
| 13 | 文件浏览 | ✅ 已完成 | FileTree 组件，目录树浏览 |
| 14 | 代码高亮 | ✅ 已完成 | Shiki + CodeBlock 组件 |

### 4.3 浏览器控制

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 15 | 浏览器导航 | ✅ 已完成 | URL 输入、前进/后退/刷新 |
| 16 | 截图预览 | ✅ 已完成 | 实时页面截图显示 |
| 17 | 元素交互 | ✅ 已完成 | 点击/输入/悬停，CSS 选择器 |
| 18 | 滚动控制 | ✅ 已完成 | 上下滚动按钮 |
| 19 | 无障碍树 | ✅ 已完成 | A11Y 树查看 |
| 20 | JS 控制台 | ✅ 已完成 | 执行 JS 表达式 |
| 21 | 启动/关闭 | ✅ 已完成 | 一键启动/关闭浏览器实例 |

### 4.4 配置与管理

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 22 | API 密钥配置 | ✅ 已完成 | SettingsPanel API 密钥输入 |
| 23 | 主题切换 | ✅ 已完成 | 深色/浅色/跟随系统 |
| 24 | MCP 服务器管理 | ✅ 已完成 | CRUD + 启用/禁用切换 |
| 25 | 权限设置 | ✅ 已完成 | 默认策略 + 逐工具权限 |
| 26 | 快捷键配置 | ✅ 已完成 | 快捷键列表展示 |
| 27 | 自定义模式管理 | ✅ 已完成 | 创建/编辑/删除，系统提示词+工具+图标 |
| 28 | 规则系统 | ✅ 已完成 | 全局/项目/工作区规则 CRUD，Markdown 编辑 |
| 29 | 模型配置 | ⚠️ 基础 | 仅展示提示，缺少参数调节 UI |

### 4.5 高级功能

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 30 | 记忆库 | ✅ 已完成 | MemoryBank 组件，CRUD + 搜索 + 分类过滤 |
| 31 | 代码库索引 | ✅ 已完成 | IndexStatus 组件，索引状态展示 |
| 32 | Token 用量追踪 | ✅ 已完成 | StatusBar 显示，消息元数据，persist 持久化 |
| 33 | 文件上传 | ✅ 已完成 | Composer 附件，MIME 推断，Base64 编码 |
| 34 | 内联补全 | ✅ 已完成 | Ghost text，Tab 接受/Esc 取消 |
| 35 | 语音输入 | ✅ 已完成 | Web Speech API 集成 |
| 36 | 斜杠命令 | ✅ 已完成 | 模式切换 + 通用命令 + 自定义模式命令 |
| 37 | 自动恢复 | ⚠️ 部分完成 | persist 已加，崩溃重载已加，resumeSession 未接入 |
| 38 | 会话分叉 UI | ❌ 未实现 | API 已有，UI 入口缺失 |
| 39 | PDF 上传 | ❌ 未实现 | 类型支持但无专门 UI |
| 40 | 窗口状态持久化 | ❌ 未实现 | 窗口大小/位置未保存 |

### 4.6 Electron 桌面

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 41 | 自定义标题栏 | ✅ 已完成 | frameless + titleBarOverlay |
| 42 | 系统托盘 | ✅ 已完成 | 最小化到托盘，托盘菜单 |
| 43 | CLI 子进程管理 | ✅ 已完成 | 自动启动/崩溃重启 |
| 44 | IPC 通信 | ✅ 已完成 | 窗口控制 + CLI + 文件系统 |
| 45 | 全局快捷键 | ✅ 已完成 | 注册/注销 |
| 46 | 自动更新 | ✅ 已完成 | electron-updater 集成 |
| 47 | 崩溃恢复 | ⚠️ 部分完成 | renderer crashed 自动 reload |
| 48 | 桌面运行时验证 | ❌ 未验证 | 构建通过但未实际启动验证 |

---

## 五、文件结构

```
kilocode-app/
├── electron/                          # Electron 主进程
│   ├── main.ts                        # 主进程入口（窗口、崩溃恢复、生命周期）
│   ├── preload.ts                     # 预加载脚本（contextBridge API）
│   ├── kilo-process.ts                # KiloCode CLI 子进程管理
│   ├── ipc-handlers.ts                # IPC 通信处理
│   ├── tray.ts                        # 系统托盘
│   ├── shortcuts.ts                   # 全局/应用快捷键
│   └── auto-updater.ts                # 自动更新
├── src/                               # React 前端
│   ├── main.tsx                       # React 入口
│   ├── App.tsx                        # 根组件（初始化 + 模拟数据加载）
│   ├── components/
│   │   ├── layout/                    # 布局
│   │   │   ├── AppShell.tsx           # 主布局壳（Sidebar + Main + Right + StatusBar）
│   │   │   ├── Sidebar.tsx   ├── MainPanel.tsx           # 中间面板（ChatPanel + Composer）
│   │   │   ├── RightPanel.tsx         # 右侧面板（Terminal/Diff/Browser/File/Memory tabs）
│   │   │   ├── Sidebar.tsx            # 侧边栏
│   │   │   ├── StatusBar.tsx          # 底部状态栏
│   │   │   └── TitleBar.tsx           # 自定义标题栏
│   │   ├── chat/                      # 对话
│   │   │   ├── ChatPanel.tsx          # 对话面板（消息流 + 空状态）
│   │   │   ├── AssistantMessage.tsx   # AI 消息（Markdown + 代码 + 工具调用 + Token 元数据）
│   │   │   ├── UserMessage.tsx        # 用户消息（内容 + 附件标签）
│   │   │   ├── ToolCallCard.tsx       # 工具调用卡片
│   │   │   └── StreamingIndicator.tsx # 流式输出指示器
│   │   ├── composer/                  # 输入
│   │   │   └── Composer.tsx           # 输入框（多行 + 附件 + 语音 + 斜杠命令 + 内联补全）
│   │   ├── sidebar/                   # 侧边栏组件
│   │   │   ├── ModeSelector.tsx       # 模式选择器（5 内置 + 自定义下拉）
│   │   │   ├── ModelSelector.tsx      # 模型选择器（629 模型/22 提供商）
│   │   │   ├── SessionList.tsx        # 会话列表
│   │   │   └── ProjectPicker.tsx      # 项目选择器
│   │   ├── settings/                  # 设置
│   │   │   ├── SettingsPanel.tsx      # 设置面板（7 个 section）
│   │   │   ├── CustomModesSection.tsx # 自定义模式管理
│   │   │   └── RulesSection.tsx       # 规则系统管理
│   │   ├── terminal/                  # 终端
│   │   │   └── TerminalPanel.tsx      # xterm.js 终端面板
│   │   ├── browser/                   # 浏览器控制
│   │   │   └── BrowserPanel.tsx       # 浏览器控制面板
│   │   ├── diff/                      # Diff
│   │   │   └── DiffViewer.tsx         # 统一 Diff 视图
│   │   ├── common/                    # 通用
│   │   │   ├── CodeBlock.tsx          # 代码块（Shiki 高亮）
│   │   │   ├── FileTree.tsx           # 文件树浏览器
│   │   │   ├── IndexStatus.tsx        # 索引状态指示器
│   │   │   ├── MemoryBank.tsx         # 记忆库面板
│   │   │   └── ThemeToggle.tsx        # 主题切换按钮
│   │   └── permission/                # 权限
│   │       └── PermissionDialog.tsx   # 权限请求弹窗
│   ├── stores/                        # Zustand 状态管理
│   │   ├── sessionStore.ts            # 会话状态（persist）
│   │   ├── configStore.ts             # 配置状态（模型/提供商/MCP/自定义模式）
│   │   ├── connectionStore.ts         # 连接状态
│   │   ├── uiStore.ts                 # UI 状态（persist: 主题/侧边栏/右面板）
│   │   ├── browserStore.ts            # 浏览器控制状态
│   │   ├── memoryStore.ts             # 记忆库状态
│   │   ├── indexStore.ts              # 代码库索引状态
│   │   ├── tokenUsageStore.ts         # Token 用量状态（persist: 历史总量）
│   │   └── rulesStore.ts              # 规则系统状态
│   ├── services/                      # 服务层
│   │   ├── kiloClient.ts              # KiloCode CLI REST API 客户端（40+ 方法）
│   │   └── eventStream.ts             # SSE 事件流管理
│   ├── hooks/                         # React Hooks
│   │   ├── useKiloConnection.ts       # CLI 连接管理（自动重试 + 首次加载）
│   │   ├── useTheme.ts                # 主题系统（系统偏好监听）
│   │   ├── useInlineCompletion.ts     # 内联代码补全
│   │   └── useVoiceInput.ts           # 语音输入
│   ├── data/                          # 数据
│   │   └── mockModels.ts              # 629 模型模拟数据（22 提供商）
│   ├── types/                         # 类型
│   │   └── kilo.d.ts                  # 完整类型定义（30+ 接口/类型）
│   ├── utils/                         # 工具
│   │   └── cn.ts                      # clsx + tailwind-merge
│   └── styles/
│       └── globals.css                # 全局样式 + CSS 变量主题
├── CHANGELOG.md                       # 更新日志
├── README.md                          # 项目说明
├── SPEC.md                            # 本文档
├── PROGRESS.md                        # 进度与交接文档
├── package.json                       # 依赖配置
├── tsconfig.json                      # TypeScript 配置
├── vite.config.ts                     # Vite 构建配置
└── electron-builder.yml               # Electron 打包配置
```

---

## 六、API 客户端方法清单

`kiloClient.ts` 提供以下 40+ 方法与 KiloCode CLI 通信：

| 分类 | 方法 | HTTP | 路径 |
|------|------|------|------|
| **会话** | listSessions | GET | /sessions |
| | createSession | POST | /session |
| | getSession | GET | /session/:id |
| | closeSession | DELETE | /session/:id |
| | forkSession | POST | /session/:id/fork |
| | resumeSession | POST | /session/:id/resume |
| **消息** | promptStream | POST | /session/:id/prompt (SSE) |
| | cancel | POST | /session/:id/cancel |
| | listMessages | GET | /session/:id/messages |
| | uploadFile | POST | /session/:id/upload (FormData) |
| | uploadBase64 | POST | /session/:id/upload-base64 |
| | inlineCompletion | POST | /session/:id/completion |
| **配置** | getConfig | GET | /config |
| | updateConfig | PUT | /config |
| | setMode | PUT | /session/:id/mode |
| | setModel | PUT | /session/:id/model |
| | listModels | GET | /models |
| | listProviders | GET | /providers |
| **MCP** | listMcpServers | GET | /mcp/servers |
| | addMcpServer | POST | /mcp/servers |
| | removeMcpServer | DELETE | /mcp/servers/:id |
| **权限** | listPermissionRequests | GET | /session/:id/permissions |
| | resolvePermission | POST | /session/:id/permissions/:id/resolve |
| **文件** | listFiles | GET | /fs/list |
| | readFile | GET | /fs/read |
| **索引** | getIndexStatus | GET | /index/status |
| | triggerIndexing | POST | /index/build |
| **浏览器** | launchBrowser | POST | /session/:id/browser/launch |
| | closeBrowser | POST | /session/:id/browser/close |
| | browserSnapshot | GET | /session/:id/browser/snapshot |
| | browserAction | POST | /session/:id/browser/action |
| | browserActionSequence | POST | /session/:id/browser/actions |
| **记忆** | listMemory | GET | /memory |
| | addMemory | POST | /memory |
| | removeMemory | DELETE | /memory/:id |
| | searchMemory | GET | /memory/search |
| **健康** | healthCheck | GET | /health |

---

## 七、模拟数据策略

未连接 KiloCode CLI 时，应用使用模拟数据确保 UI 可交互：

| 数据 | 来源 | 数量 |
|------|------|------|
| 模型列表 | mockModels.ts | 629 模型 / 22 提供商 |
| 提供商列表 | mockModels.ts | 22 提供商 |
| 自定义模式 | configStore.loadCustomModes | 2 个 (Architect, Mentor) |
| 规则文件 | rulesStore.loadRules | 5 条 (全局2/项目2/工作区1) |
| 记忆条目 | memoryStore.loadEntries | 5 条 |
| AI 回复 | simulateReply | 按模式生成不同模板回复 |
| 浏览器页面 | browserStore mock | 3 个示例页面 |
| Token 用量 | simulateReply | 基于字符数估算 |

---

## 八、品牌与设计规范

### 8.1 色彩系统

| 用途 | CSS 变量 | 深色值 | 浅色值 |
|------|----------|--------|--------|
| 品牌主色 | --brand-primary | #FFD700 | #B8960F |
| 品牌悬停 | --brand-hover | #FFE44D | #D4A800 |
| 品牌淡底 | --brand-muted | rgba(255,215,0,0.1) | rgba(184,150,15,0.1) |
| 品牌微弱 | --brand-subtle | rgba(255,215,0,0.05) | rgba(184,150,15,0.05) |
| 交互色 | --accent | #00bcd4 | #0097A7 |
| 成功 | --success | #4caf50 | #2e7d32 |
| 警告 | --warning | #ff9800 | #e65100 |
| 错误 | --error | #f44336 | #c62828 |

### 8.2 布局规范

- 左侧边栏：240px 宽，可折叠
- 右侧面板：400px 宽，5 个 tab（Terminal/Diff/Browser/Files/Memory）
- 底部状态栏：28px 高
- 自定义标题栏：36px 高
- 消息最大宽度：90%
- 字体：系统字体栈，代码用等宽字体

---

## 九、构建与部署

### 9.1 开发

```bash
npm install
npm run dev          # Vite dev server (浏览器预览)
npm run electron:dev # Electron 开发模式
```

### 9.2 构建

```bash
npx tsc --noEmit     # TypeScript 类型检查
npx vite build       # Vite 生产构建
npm run electron:build # 完整 Electron 打包
```

### 9.3 当前构建状态

- ✅ TypeScript 类型检查：0 错误
- ✅ Vite 生产构建：成功（client ~568KB gzip ~149KB, main 8.5KB, preload 2.3KB）
- ❌ Electron 桌面运行时：未验证

---

## 十、待实现功能详细规格

### 10.1 会话分叉 UI (Session Fork)

**需求**：用户可从任意消息点分叉对话，创建新会话继续探索不同方向。

**API**：`kiloClient.forkSession(id, fromMessageId?)` 已实现。

**UI 设计**：
- 每条消息 hover 时显示「分叉」按钮（GitBranch 图标）
- 点击后调用 `forkSession`，自动切换到新会话
- 新会话标题格式：`原会话标题 (分叉)`
- 斜杠命令 `/fork` 也应触发分叉（从最后一条消息）

**实现要点**：
1. 在 `AssistantMessage` 和 `UserMessage` 添加 hover 显示的分叉按钮
2. 调用 `useSessionStore.getState().forkSession(sessionId, messageId)`
3. 未连接 CLI 时，本地模拟分叉（复制消息到新会话）

### 10.2 自动恢复完善 (Auto-Recovery)

**已完成**：
- sessionStore persist（localStorage 持久化会话/消息/模式/模型）
- tokenUsageStore persist（持久化历史总量）
- Electron main.ts renderer crashed 自动 reload
- 流式状态恢复时重置（merge 函数）

**待完成**：
1. **连接恢复后 resume 活跃会话**：在 `useKiloConnection` 首次连接成功时，检查 `activeSessionId`，若有则调用 `kiloApi.resumeSession(id)` 恢复服务端状态
2. **窗口状态持久化**：保存窗口大小/位置到 localStorage，启动时恢复
3. **未完成流式输出恢复提示**：恢复后若 `isStreaming` 为 true（被重置为 false），显示「上次会话中断」提示

### 10.3 PDF 上传

**需求**：支持上传 PDF 文件，提取文本内容发送给 AI。

**实现要点**：
1. Composer 附件处理中识别 PDF MIME (`application/pdf`)
2. 使用 `pdf.js` 或服务端提取 PDF 文本
3. 大 PDF 分块发送，避免超出上下文窗口
4. UI 显示 PDF 附件标签（FileText 图标 + 页数）

### 10.4 Electron 桌面运行时验证

**需求**：验证应用能以桌面窗口正常启动运行。

**验证清单**：
1. `npm run electron:dev` 启动后窗口正常显示
2. 自定义标题栏渲染正确（最小化/最大化/关闭按钮）
3. 系统托盘图标显示，右键菜单可用
4. CLI 子进程自动启动（或优雅降级到模拟模式）
5. 主题切换正常（深色/浅色/跟随系统）
6. 窗口大小/位置正常
7. 快捷键响应

---

## 十一、质量标准

| 指标 | 标准 |
|------|------|
| TypeScript | `npx tsc --noEmit` 零错误 |
| 构建 | `npx vite build` 成功 (exit 0) |
| 代码风格 | 一致使用 TypeScript strict 模式 |
| 注释 | 模块级多行注释 + 函数级 docstring + 关键逻辑说明 |
| CHANGELOG | 每次变更必须更新 |
| 模拟模式 | 未连接 CLI 时所有 UI 可交互 |
