# 终端功能修复计划

> 日期：2026-07-27
> 状态：待审批
> 影响范围：终端面板、IPC 通信、主进程 PTY 管理

---

## 一、问题总览

终端功能「完全不可用」由 5 个层面的问题叠加导致，按严重程度分为 P0（致命）、P1（核心功能缺失）、P2（体验优化）三级。

| 优先级 | 问题 | 根因 | 影响 |
|--------|------|------|------|
| P0 | xterm CSS 未引入 | `TerminalPanel.tsx` 只动态 import JS，未引入 `@xterm/xterm/css/xterm.css` | 终端无基础样式，渲染空白或错乱 |
| P0 | IPC 快捷键事件无人监听 | 主进程发送 `action:toggleTerminal` 等 4 个事件，渲染进程无 `window.api.on()` 监听 | Ctrl+J/B/N/, 全部无效 |
| P1 | 无本地 PTY 后备 | 项目无 `node-pty`，PTY 完全依赖 `kilo serve` CLI 的 `/pty` WebSocket 端点 | CLI 未运行时终端只有 5 个玩具命令 |
| P1 | 终端生命周期管理缺陷 | `useEffect` 依赖 `[connected, port]`，状态变化时销毁重建整个终端 | 连接变化时历史丢失、监听器泄漏 |
| P2 | 容器尺寸适配不完善 | 只监听 `window.resize`，未用 `ResizeObserver`；抽屉展开不触发 fit | 抽屉展开后终端尺寸不更新 |

---

## 二、修复方案详述

### P0-1：引入 xterm CSS 样式

**文件**：`src/components/terminal/TerminalPanel.tsx`

**修改**：在文件顶部添加静态 import

```tsx
import '@xterm/xterm/css/xterm.css'
```

**原因**：xterm.js 的 JS 模块只负责 DOM 构建和逻辑，所有视觉样式（字体、光标、行高、选区、滚动条）都在 CSS 中定义。动态 `import('@xterm/xterm')` 只加载了 JS，CSS 必须单独引入。

**验证**：终端面板应显示黑色背景、金色光标、等宽字体，输入字符可见。

---

### P0-2：注册 IPC 快捷键事件监听

**文件**：`src/App.tsx`

**修改**：添加 `useEffect` 注册 4 个 `action:` IPC 事件监听器

```tsx
useEffect(() => {
  const api = window.api
  if (!api) return

  // Ctrl+J: 切换终端面板
  const handleToggleTerminal = () => {
    const { rightPanelTab, setRightPanelTab, toggleRightPanel } = useUiStore.getState()
    if (rightPanelVisible && rightPanelTab === 'terminal') {
      toggleRightPanel()
    } else {
      setRightPanelTab('terminal')
    }
  }

  // Ctrl+B: 切换侧边栏
  const handleToggleSidebar = () => {
    useUiStore.getState().toggleSidebar()
  }

  // Ctrl+N: 新建会话
  const handleNewSession = () => {
    useSessionStore.getState().createSession()
  }

  // Ctrl+,: 打开设置
  const handleOpenSettings = () => {
    useUiStore.getState().setSettingsOpen(true)
  }

  api.on('action:toggleTerminal', handleToggleTerminal)
  api.on('action:toggleSidebar', handleToggleSidebar)
  api.on('action:newSession', handleNewSession)
  api.on('action:openSettings', handleOpenSettings)

  return () => {
    api.off('action:toggleTerminal', handleToggleTerminal)
    api.off('action:toggleSidebar', handleToggleSidebar)
    api.off('action:newSession', handleNewSession)
    api.off('action:openSettings', handleOpenSettings)
  }
}, [])
```

**注意**：需要从对应 store 导入 `useUiStore`、`useSessionStore`。`rightPanelVisible` 需在 effect 内通过 `useUiStore.getState()` 获取最新值，避免闭包陷阱。

**验证**：Ctrl+J 打开/关闭终端面板，Ctrl+B 切换侧边栏，Ctrl+N 新建会话，Ctrl+, 打开设置。

---

### P1-1：集成本地 node-pty（核心功能）

**目标**：在 Electron 主进程中集成 `node-pty`，通过 IPC 桥接到渲染进程，使终端不依赖 CLI 即可执行真实 shell 命令。

#### 步骤 1：安装依赖

```bash
cd kilocode-app
npm install node-pty
npm install -D electron-rebuild
npx electron-rebuild
```

#### 步骤 2：新增 `electron/pty-manager.ts`

```typescript
import { spawn, IPty } from 'node-pty'
import { EventEmitter } from 'events'

/**
 * PTY 进程管理器
 *
 * 管理本地伪终端实例的生命周期，
 * 通过 IPC 为渲染进程提供真实 shell 能力。
 */
export class PtyManager extends EventEmitter {
  private instances: Map<string, IPty> = new Map()

  /**
   * 创建 PTY 实例
   * @param id - 终端实例唯一标识
   * @param cols - 初始列数
   * @param rows - 初始行数
   * @param cwd - 工作目录（可选）
   */
  create(id: string, cols: number = 80, rows: number = 24, cwd?: string): void {
    if (this.instances.has(id)) {
      throw new Error(`PTY instance ${id} already exists`)
    }

    const shell = process.platform === 'win32'
      ? 'powershell.exe'
      : process.env.SHELL || '/bin/bash'

    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwd || process.env.HOME || process.cwd(),
      env: { ...process.env } as Record<string, string>,
    })

    // PTY 输出转发给渲染进程
    pty.onData((data: string) => {
      this.emit('data', id, data)
    })

    pty.onExit(({ exitCode }) => {
      this.instances.delete(id)
      this.emit('exit', id, exitCode)
    })

    this.instances.set(id, pty)
  }

  /** 向 PTY 写入数据（用户输入） */
  write(id: string, data: string): void {
    this.instances.get(id)?.write(data)
  }

  /** 调整 PTY 尺寸 */
  resize(id: string, cols: number, rows: number): void {
    this.instances.get(id)?.resize(cols, rows)
  }

  /** 杀死 PTY 进程 */
  kill(id: string): void {
    this.instances.get(id)?.kill()
    this.instances.delete(id)
  }

  /** 清理所有 PTY 实例 */
  dispose(): void {
    for (const [id] of this.instances) {
      this.kill(id)
    }
  }
}
```

#### 步骤 3：修改 `electron/ipc-handlers.ts`

新增 PTY 相关 IPC 通道：

```typescript
import { PtyManager } from './pty-manager'

export function registerIpcHandlers(kiloProcess: KiloProcess | null, ptyManager: PtyManager): void {
  // ... 现有代码 ...

  // ===== PTY 终端相关 =====

  ipcMain.handle('pty:create', (event, { id, cols, rows, cwd }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    // PTY 输出推送到渲染进程
    ptyManager.on('data', (ptyId: string, data: string) => {
      win?.webContents.send('pty:data', ptyId, data)
    })
    ptyManager.on('exit', (ptyId: string, exitCode: number) => {
      win?.webContents.send('pty:exit', ptyId, exitCode)
    })
    ptyManager.create(id, cols, rows, cwd)
  })

  ipcMain.on('pty:write', (_, { id, data }) => {
    ptyManager.write(id, data)
  })

  ipcMain.on('pty:resize', (_, { id, cols, rows }) => {
    ptyManager.resize(id, cols, rows)
  })

  ipcMain.on('pty:kill', (_, { id }) => {
    ptyManager.kill(id)
  })
}
```

#### 步骤 4：修改 `electron/main.ts`

初始化 PtyManager 并传入 IPC 注册：

```typescript
import { PtyManager } from './pty-manager'

let ptyManager: PtyManager | null = null

app.whenReady().then(() => {
  // ... 现有代码 ...

  ptyManager = new PtyManager()
  registerIpcHandlers(kiloProcess, ptyManager)

  // ... 现有代码 ...
})

// 退出时清理
app.on('before-quit', () => {
  ptyManager?.dispose()
  // ... 现有清理 ...
})
```

#### 步骤 5：修改 `electron/preload.ts`

暴露 PTY API：

```typescript
const api = {
  // ... 现有 API ...

  /** PTY 终端操作 */
  pty: {
    create: (id: string, cols: number, rows: number, cwd?: string): Promise<void> =>
      ipcRenderer.invoke('pty:create', { id, cols, rows, cwd }),
    write: (id: string, data: string): void =>
      ipcRenderer.send('pty:write', { id, data }),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('pty:resize', { id, cols, rows }),
    kill: (id: string): void =>
      ipcRenderer.send('pty:kill', { id }),
    onData: (callback: (id: string, data: string) => void) => {
      ipcRenderer.on('pty:data', (_, id, data) => callback(id, data))
    },
    onExit: (callback: (id: string, exitCode: number) => void) => {
      ipcRenderer.on('pty:exit', (_, id, exitCode) => callback(id, exitCode))
    },
  },
}
```

#### 步骤 6：修改 `src/types/kilo.d.ts`

添加 PTY 类型声明：

```typescript
interface Window {
  api: {
    // ... 现有声明 ...
    pty: {
      create: (id: string, cols: number, rows: number, cwd?: string) => Promise<void>
      write: (id: string, data: string) => void
      resize: (id: string, cols: number, rows: number) => void
      kill: (id: string) => void
      onData: (callback: (id: string, data: string) => void) => void
      onExit: (callback: (id: string, exitCode: number) => void) => void
    }
  }
}
```

#### 步骤 7：修改 `electron-builder.yml`

确保 `node-pty` 原生模块被正确打包：

```yaml
npmRebuild: true
buildDependenciesFromSource: true
```

**验证**：终端面板打开后应显示系统 shell 提示符（Windows 为 PowerShell），可执行任意命令。

---

### P1-2：重构终端组件生命周期

**文件**：`src/components/terminal/TerminalPanel.tsx`

**核心改动**：将终端初始化和连接管理分离为两个独立的 `useEffect`

```tsx
// Effect 1: 终端实例只创建一次
useEffect(() => {
  if (!terminalRef.current) return

  let terminal: Terminal
  let fitAddon: FitAddon

  const init = async () => {
    const { Terminal } = await import('@xterm/xterm')
    const { FitAddon } = await import('@xterm/addon-fit')
    const { WebLinksAddon } = await import('@xterm/addon-web-links')

    terminal = new Terminal({ /* 配置 */ })
    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(terminalRef.current!)
    fitAddon.fit()

    xtermRef.current = terminal
  }

  init()

  return () => {
    terminal?.dispose()
    xtermRef.current = null
  }
}, []) // 空依赖 — 只创建一次

// Effect 2: 连接管理（PTY 或 WebSocket）
useEffect(() => {
  const terminal = xtermRef.current
  if (!terminal) return

  // 优先使用本地 PTY（IPC）
  if (window.api?.pty) {
    connectLocalPty(terminal)
  } else if (connected) {
    // 降级：使用 CLI WebSocket PTY
    connectWebSocket(terminal, port)
  } else {
    // 最终降级：本地模拟模式
    startLocalMode(terminal)
  }

  return () => {
    // 清理连接，不销毁终端
  }
}, [connected, port])
```

**关键改进**：
- 终端实例与连接解耦，重连不丢失历史
- `terminal.onData`/`terminal.onResize` 返回的 `IDisposable` 在 cleanup 中调用 `.dispose()`
- WebSocket 断开后自动重连（指数退避，最大 30 秒）

---

### P2-1：容器尺寸适配优化

**文件**：`src/components/terminal/TerminalPanel.tsx`

**修改**：用 `ResizeObserver` 替代 `window.resize` 监听

```tsx
useEffect(() => {
  const terminal = xtermRef.current
  const container = terminalRef.current
  if (!terminal || !container) return

  const fitAddon = fitAddonRef.current
  if (!fitAddon) return

  const observer = new ResizeObserver(() => {
    fitAddon.fit()
  })

  observer.observe(container)

  return () => observer.disconnect()
}, [])
```

**额外**：在 `RightPanel.tsx` 中，抽屉展开动画结束后通知终端 fit：

```tsx
// 抽屉展开后触发终端尺寸适配
useEffect(() => {
  if (rightPanelVisible && rightPanelTab === 'terminal') {
    // 等待 CSS transition 完成
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('terminal:fit'))
    }, 300)
    return () => clearTimeout(timer)
  }
}, [rightPanelVisible, rightPanelTab])
```

---

## 三、实施顺序

```
Phase 1（最小可用，~30 行代码）
  ├── P0-1: 引入 xterm CSS
  └── P0-2: 注册 IPC 事件监听

Phase 2（核心功能，~200 行代码）
  ├── P1-1: 集成 node-pty
  │   ├── 安装依赖 + electron-rebuild
  │   ├── 新增 pty-manager.ts
  │   ├── 修改 ipc-handlers.ts / main.ts / preload.ts
  │   ├── 更新类型声明
  │   └── 修改 electron-builder.yml
  └── P1-2: 重构终端生命周期
      ├── 分离终端初始化与连接管理
      ├── 添加 WebSocket 重连逻辑
      └── 修复监听器泄漏

Phase 3（体验优化，~20 行代码）
  └── P2-1: ResizeObserver + 抽屉展开适配
```

---

## 四、风险与注意事项

1. **node-pty 原生模块编译**：Windows 上需要 Visual Studio Build Tools，需在 README 中说明开发环境要求
2. **electron-builder 打包**：`node-pty` 是原生模块，需确保 `electron-rebuild` 在打包前执行，`electron-builder.yml` 配置 `npmRebuild: true`
3. **CSP 策略**：当前 `index.html` 的 CSP 已允许 `ws://localhost:*`，WebSocket 连接不受影响
4. **向后兼容**：本地 PTY 优先，CLI WebSocket PTY 作为可选降级，不影响现有 CLI 集成架构
5. **多终端实例**：当前设计为单终端，`PtyManager` 使用 Map 支持多实例，为未来多终端预留扩展能力

---

## 五、验证清单

- [ ] 终端面板显示黑色背景、等宽字体、金色光标
- [ ] Ctrl+J 打开/关闭终端面板
- [ ] Ctrl+B 切换侧边栏
- [ ] Ctrl+N 新建会话
- [ ] Ctrl+, 打开设置
- [ ] 终端可执行系统 shell 命令（dir/ls、echo、pwd 等）
- [ ] 终端支持中文输入和显示
- [ ] 终端窗口缩放时自动适配尺寸
- [ ] 抽屉展开后终端尺寸正确
- [ ] WebSocket 断开后终端不丢失历史
- [ ] 应用退出时 PTY 进程正确清理
