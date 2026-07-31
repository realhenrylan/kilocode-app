import { spawn, execSync, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

/**
 * KiloCode CLI 子进程管理器
 *
 * 职责：启动/停止 `kilo serve` 进程，管理其生命周期，
 * 并通过 HTTP REST + SSE + WebSocket 为渲染进程提供服务。
 *
 * 端口策略：默认 4096，若被占用则 CLI 自动递增扫描 4097-4116
 *
 * 防护机制：
 * - 启动前清理占用端口的旧 kilo 进程（避免端口冲突导致黑屏）
 * - Windows 兼容的进程终止（taskkill /f /t 杀死进程树）
 * - 单实例锁（main.ts 中 app.requestSingleInstanceLock）
 */
export class KiloProcess extends EventEmitter {
  private process: ChildProcess | null = null
  /** 记录子进程 PID，用于精准终止 */
  private _pid: number | null = null
  private _port: number = 4096
  private _ready: boolean = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  /** 获取当前服务端口 */
  get port(): number {
    return this._port
  }

  /** CLI 是否就绪 */
  get ready(): boolean {
    return this._ready
  }

  /**
   * 清理占用端口的旧 kilo 进程
   *
   * 当 Electron 异常退出（崩溃/杀进程）时，kilo serve 子进程可能成为孤儿进程
   * 继续占用端口，导致下次启动时 CLI 无法绑定端口而黑屏。
   * 此方法在启动前检测并杀死占用端口的旧 kilo.exe。
   */
  private cleanupStaleProcess(): void {
    if (process.platform !== 'win32') return

    try {
      // 查找监听目标端口的进程 PID
      const netstatOutput = execSync(
        `netstat -ano | findstr ":${this._port}.*LISTEN"`,
        { encoding: 'utf-8', timeout: 5000, windowsHide: true }
      )

      // 解析 netstat 输出，提取最后一列的 PID
      const pidMatch = netstatOutput.match(/(\d+)\s*$/m)
      if (!pidMatch) return

      const pid = parseInt(pidMatch[1], 10)
      if (isNaN(pid) || pid === 0) return

      // 确认该 PID 对应的是 kilo.exe（避免误杀其他进程）
      const tasklistOutput = execSync(
        `tasklist /fi "PID eq ${pid}" /fo csv /nh`,
        { encoding: 'utf-8', timeout: 5000, windowsHide: true }
      )

      const imageName = tasklistOutput.split(',')[0]?.replace(/"/g, '').toLowerCase()
      if (imageName !== 'kilo.exe') return

      // 强制杀死旧 kilo 进程（/t 杀死进程树，/f 强制终止）
      execSync(`taskkill /f /t /pid ${pid}`, {
        encoding: 'utf-8',
        timeout: 5000,
        windowsHide: true,
      })
      console.log(`[kilo-process] Killed stale kilo.exe (PID ${pid}) on port ${this._port}`)
    } catch {
      // netstat/findstr 无匹配时会抛出非零退出码，属于正常情况，忽略
    }
  }

  /**
   * 启动 KiloCode CLI 服务
   * @returns 服务端口号；CLI 不可用时返回默认端口并标记为降级模式
   */
  async start(): Promise<number> {
    if (this.process) {
      return this._port
    }

    // 启动前清理可能占用端口的旧 kilo 进程
    this.cleanupStaleProcess()

    return new Promise((resolve, _reject) => {
      try {
        // 启动 kilo serve 子进程
        this.process = spawn('kilo', ['serve', '--port', String(this._port)], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
          shell: true,
        })

        // 记录子进程 PID，用于精准终止
        this._pid = this.process.pid ?? null

        let started = false

        // 监听 stdout，解析端口号
        this.process.stdout?.on('data', (data: Buffer) => {
          const output = data.toString()
          console.log('[kilo serve]', output)

          // 解析 CLI 输出中的端口号
          const portMatch = output.match(/port[:\s]+(\d+)/i)
          if (portMatch) {
            this._port = parseInt(portMatch[1], 10)
          }

          // 检测服务就绪标志
          if (output.includes('ready') || output.includes('listening') || output.includes('started')) {
            this._ready = true
            this.emit('ready', this._port)
            if (!started) {
              started = true
              resolve(this._port)
            }
          }
        })

        // 监听 stderr
        this.process.stderr?.on('data', (data: Buffer) => {
          const output = data.toString()
          console.error('[kilo serve stderr]', output)

          // 某些 CLI 将就绪信息输出到 stderr
          if (output.includes('ready') || output.includes('listening')) {
            this._ready = true
            this.emit('ready', this._port)
            if (!started) {
              started = true
              resolve(this._port)
            }
          }
        })

        // 进程异常退出处理
        this.process.on('error', (err) => {
          console.error('[kilo serve] process error:', err)
          this._ready = false
          this.process = null
          this._pid = null
          if (!started) {
            // CLI 不可用时优雅降级：返回默认端口，前端将进入 mock 模式
            console.warn('[kilo serve] CLI not available, falling back to mock mode')
            started = true
            resolve(this._port)
          } else {
            this.emit('error', err)
            this.scheduleRestart()
          }
        })

        // 进程退出处理
        this.process.on('exit', (code, signal) => {
          console.log(`[kilo serve] exited with code ${code}, signal ${signal}`)
          this._ready = false
          this.process = null
          this._pid = null
          if (!started) {
            // CLI 不可用时优雅降级：返回默认端口，前端将进入 mock 模式
            console.warn('[kilo serve] CLI not available, falling back to mock mode')
            started = true
            resolve(this._port)
          } else if (code !== 0) {
            // 非正常退出，尝试重启
            this.scheduleRestart()
          }
        })

        // 超时保护：10秒内未检测到就绪，尝试直接连接
        setTimeout(() => {
          if (!started) {
            this._ready = true
            started = true
            resolve(this._port)
          }
        }, 10000)

      } catch (err) {
        // spawn 本身抛出异常（如命令不存在），优雅降级
        console.warn('[kilo serve] CLI spawn failed, falling back to mock mode:', err)
        this.process = null
        this._pid = null
        resolve(this._port)
      }
    })
  }

  /**
   * 停止 KiloCode CLI 服务
   *
   * Windows 兼容说明：
   * - Node.js 在 Windows 上 kill('SIGTERM') 等同于 TerminateProcess，
   *   不会给进程优雅退出的机会，且无法杀死子进程树
   * - 使用 taskkill /f /t /pid 可确保杀死整个进程树
   */
  stop(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }

    if (this._pid != null) {
      const pid = this._pid

      if (process.platform === 'win32') {
        // Windows：使用 taskkill 杀死进程树（/t = 递归杀死子进程，/f = 强制终止）
        try {
          execSync(`taskkill /f /t /pid ${pid}`, {
            encoding: 'utf-8',
            timeout: 5000,
            windowsHide: true,
          })
          console.log(`[kilo-process] Killed kilo process tree (PID ${pid})`)
        } catch {
          // 进程可能已退出，忽略错误
          console.log(`[kilo-process] kilo process (PID ${pid}) already exited`)
        }
      } else {
        // macOS/Linux：先 SIGTERM 优雅关闭，2秒后 SIGKILL 强制终止
        try {
          process.kill(pid, 'SIGTERM')
        } catch {
          // 进程可能已退出
        }
        setTimeout(() => {
          try {
            process.kill(pid, 'SIGKILL')
          } catch {
            // 进程可能已退出
          }
        }, 2000)
      }

      this.process = null
      this._pid = null
      this._ready = false
    }
  }

  /**
   * 重启 CLI 服务
   */
  async restart(): Promise<number> {
    this.stop()
    return this.start()
  }

  /**
   * 自动重启调度（延迟5秒，避免频繁重启）
   */
  private scheduleRestart(): void {
    if (this.restartTimer) return
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.restart().catch((err) => {
        console.error('[kilo serve] auto-restart failed:', err)
      })
    }, 5000)
  }
}
