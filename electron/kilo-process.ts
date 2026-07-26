import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

/**
 * KiloCode CLI 子进程管理器
 *
 * 职责：启动/停止 `kilo serve` 进程，管理其生命周期，
 * 并通过 HTTP REST + SSE + WebSocket 为渲染进程提供服务。
 *
 * 端口策略：默认 4096，若被占用则 CLI 自动递增扫描 4097-4116
 */
export class KiloProcess extends EventEmitter {
  private process: ChildProcess | null = null
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
   * 启动 KiloCode CLI 服务
   * @returns 服务端口号；CLI 不可用时返回默认端口并标记为降级模式
   */
  async start(): Promise<number> {
    if (this.process) {
      return this._port
    }

    return new Promise((resolve, _reject) => {
      try {
        // 启动 kilo serve 子进程
        this.process = spawn('kilo', ['serve', '--port', String(this._port)], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
          shell: true,
        })

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
        resolve(this._port)
      }
    })
  }

  /**
   * 停止 KiloCode CLI 服务
   */
  stop(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }

    if (this.process) {
      // 优雅关闭：先发送 SIGTERM，2秒后强制 SIGKILL
      this.process.kill('SIGTERM')
      const proc = this.process
      setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {
          // 进程可能已退出
        }
      }, 2000)
      this.process = null
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
