# KiloCode Desktop

KiloCode Windows 桌面端应用程序 — AI 驱动的编程助手。

> 📋 完整规格见 [SPEC.md](./SPEC.md)，进度与交接见 [PROGRESS.md](./PROGRESS.md)，变更日志见 [CHANGELOG.md](./CHANGELOG.md)

## 特性

- 🤖 **全功能 KiloCode** — 包含 KiloCode 所有核心功能
- 🎨 **Codex 风格 UI** — 前端设计完全参考 OpenAI Codex 桌面端
- 🌙 **三主题支持** — 深色/浅色/跟随系统三种主题模式
- 💛 **KiloCode 品牌黄** — 融入 KiloCode 专属品牌色 (#FFD700)
- ⚡ **5+ Agent 模式** — Code / Plan / Ask / Debug / Review + 自定义模式
- 🧠 **629 模型支持** — 22 个提供商，分组搜索，特性标识
- 💬 **流式对话** — SSE 流式 AI 回复，Markdown 渲染 + 代码高亮
- 💻 **集成终端** — @xterm/xterm 终端面板
- 📝 **Diff 查看** — 统一 Diff 视图 + Shiki 语法高亮
- 🌐 **浏览器控制** — 导航/截图/交互/无障碍树/JS 控制台
- 🔌 **MCP 管理** — MCP 服务器 CRUD + 启用/禁用
- 🔐 **权限控制** — 默认策略 + 逐工具权限 + 实时弹窗
- 📂 **文件浏览** — 项目文件树浏览器
- 🧠 **记忆库** — AI 记忆条目 CRUD + 搜索 + 分类
- 📊 **Token 追踪** — 实时用量/费用显示，历史累计持久化
- 📎 **文件上传** — 拖拽/点击附件，MIME 推断，Base64 编码
- ✨ **内联补全** — Ghost text 提示，Tab 接受/Esc 取消
- 🎤 **语音输入** — Web Speech API 语音识别
- ⚙️ **自定义模式** — 创建专属 Agent 模式（系统提示词+工具+图标）
- 📜 **规则系统** — 全局/项目/工作区规则管理，Markdown 编辑
- 🔄 **自动恢复** — 状态持久化 + 崩溃自动重载
- 🛡️ **系统托盘** — 最小化到托盘，托盘菜单
- 🔄 **自动更新** — electron-updater 集成

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33+ |
| 前端框架 | React 19 + TypeScript |
| UI 组件 | Radix UI + Tailwind CSS v4 |
| 状态管理 | Zustand (含 persist 中间件) |
| 代码高亮 | Shiki |
| 终端 | @xterm/xterm |
| 构建工具 | Vite 8 + electron-builder |
| 后端通信 | HTTP REST + SSE (KiloCode CLI) |

## 开发

### 前置要求

- Node.js 18+
- npm 9+
- KiloCode CLI（可选，未安装时以模拟模式运行）

### 安装依赖

```bash
cd kilocode-app
npm install
```

### 开发模式

```bash
npm run dev          # Vite dev server（浏览器预览，模拟模式）
npm run electron:dev # Electron 开发模式（需 KiloCode CLI）
```

### 构建

```bash
npx tsc --noEmit     # TypeScript 类型检查
npx vite build       # Vite 生产构建
npm run electron:build # 完整 Electron 打包
```

## 项目结构

```
kilocode-app/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口（窗口、崩溃恢复、生命周期）
│   ├── preload.ts               # 预加载脚本（contextBridge API）
│   ├── kilo-process.ts          # KiloCode CLI 子进程管理
│   ├── ipc-handlers.ts          # IPC 通信处理
│   ├── tray.ts                  # 系统托盘
│   ├── shortcuts.ts             # 全局/应用快捷键
│   └── auto-updater.ts          # 自动更新
├── src/                         # React 前端
│   ├── components/
│   │   ├── layout/              # 布局 (AppShell, Sidebar, MainPanel, RightPanel, StatusBar, TitleBar)
│   │   ├── chat/                # 对话 (ChatPanel, AssistantMessage, UserMessage, ToolCallCard)
│   │   ├── composer/            # 输入 (Composer + 斜杠命令 + 内联补全)
│   │   ├── sidebar/             # 侧边栏 (ModeSelector, ModelSelector, SessionList, ProjectPicker)
│   │   ├── settings/            # 设置 (SettingsPanel, CustomModesSection, RulesSection)
│   │   ├── terminal/            # 终端 (TerminalPanel)
│   │   ├── browser/             # 浏览器 (BrowserPanel)
│   │   ├── diff/                # Diff (DiffViewer)
│   │   ├── common/              # 通用 (CodeBlock, FileTree, IndexStatus, MemoryBank, ThemeToggle)
│   │   └── permission/          # 权限 (PermissionDialog)
│   ├── stores/                  # Zustand 状态管理 (9 个 store)
│   ├── services/                # API 客户端 + 事件流
│   ├── hooks/                   # React Hooks (4 个)
│   ├── data/                    # 模拟数据 (629 模型)
│   ├── types/                   # TypeScript 类型定义
│   ├── utils/                   # 工具函数
│   └── styles/                  # 全局样式 + CSS 变量主题
├── SPEC.md                      # 项目规格文档
├── PROGRESS.md                  # 进度与交接文档
├── CHANGELOG.md                 # 更新日志
└── package.json
```

## 主题系统

支持三种主题模式：
- **深色 (Dark)** — 默认，Codex 风格深色主题
- **浅色 (Light)** — 浅色主题，品牌黄加深保证对比度
- **跟随系统 (System)** — 自动跟随 Windows 系统主题设置

品牌色策略：
- **KiloCode 黄 (#FFD700)** — 品牌标识：Logo、激活高亮、发送按钮
- **Cyan (#00bcd4)** — 交互反馈：链接、代码引用、进度条

## 模拟模式

未连接 KiloCode CLI 时，应用自动进入模拟模式：
- 629 个模拟模型（22 个提供商）
- 5 种内置模式 + 2 个自定义模式的模拟回复
- 5 条记忆条目 + 5 条规则文件
- 3 个浏览器示例页面
- Token 用量估算

所有 UI 组件可正常交互，方便开发和演示。

## 许可证

MIT
