import { EventEmitter } from 'events'

/**
 * PTY 进程管理器
 *
 * 管理本地伪终端实例的生命周期，
 * 通过 IPC 为渲染进程提供真实 shell 能力。
 * 使用 Map 存储实例，支持多终端扩展。
 *
 * node-pty 为可选依赖：若原生模块编译失败（如缺少 Visual Studio Build Tools
 * 或路径含空格），available=false，渲染进程自动降级到 WebSocket/本地模拟模式。
 */
export class PtyManager extends EventEmitter {
  private instances: Map<string, any> = new Map()
  private ptyModule: typeof import('node-pty') | null = null

  /** node-pty 是否可用（原生模块编译成功时为 true） */
  available: boolean = false

  constructor() {
    super()
    this.tryLoadPty()
  }

  /** 尝试加载 node-pty 原生模块 */
  private tryLoadPty(): void {
    try {
      this.ptyModule = require('node-pty') as typeof import('node-pty')
      this.available = true
      console.log('[PtyManager] node-pty loaded successfully')
    } catch (err) {
      this.ptyModule = null
      this.available = false
      console.warn('[PtyManager] node-pty not available, terminal will use fallback mode:', err)
    }
  }

  /**
   * 创建 PTY 实例
   * @param id - 终端实例唯一标识
   * @param cols - 初始列数
   * @param rows - 初始行数
   * @param cwd - 工作目录（可选）
   */
  create(id: string, cols: number = 80, rows: number = 24, cwd?: string): void {
    if (!this.ptyModule) {
      throw new Error('node-pty is not available')
    }

    // 已存在同 ID 的实例时先清理，避免 "already exists" 错误
    // （可能由 Effect 重连导致）
    if (this.instances.has(id)) {
      try {
        this.instances.get(id).kill()
      } catch {
        // 旧实例可能已退出，忽略清理错误
      }
      this.instances.delete(id)
    }

    // Windows 使用 PowerShell，其他平台使用 $SHELL 或 bash
    const shell =
      process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

    const pty = this.ptyModule.spawn(shell, [], {
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

    pty.onExit(({ exitCode }: { exitCode: number }) => {
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

  /** 清理所有 PTY 实例（应用退出时调用） */
  dispose(): void {
    for (const [id] of this.instances) {
      this.kill(id)
    }
  }
}
