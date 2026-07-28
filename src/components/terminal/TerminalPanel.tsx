import { useEffect, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import { useConnectionStore } from '@/stores/connectionStore'
import type { IDisposable } from '@xterm/xterm'

/**
 * 终端面板组件
 *
 * 基于 xterm.js 的集成终端，支持三级连接策略：
 * 1. 本地 PTY（通过 IPC 桥接 node-pty）— 优先
 * 2. CLI WebSocket PTY — 降级
 * 3. 本地模拟模式 — 最终降级
 *
 * 终端实例与连接管理解耦，重连不丢失历史记录。
 */
export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const disposablesRef = useRef<IDisposable[]>([])
  const ptyIdRef = useRef<string>(`pty-${Date.now()}`)
  const { connected, port } = useConnectionStore()

  /** xterm 实例是否已就绪，用于解决 Effect 2 的竞态条件 */
  const [terminalReady, setTerminalReady] = useState(false)

  /**
   * Effect 1: 终端实例只创建一次
   *
   * 终端 DOM 和 xterm 实例的生命周期独立于连接状态，
   * 避免连接变化时销毁重建导致历史丢失。
   * 完成后设置 terminalReady=true，触发 Effect 2 连接。
   */
  useEffect(() => {
    if (!terminalRef.current) return

    let terminal: any
    let fitAddon: any
    let disposed = false

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      const { WebLinksAddon } = await import('@xterm/addon-web-links')

      terminal = new Terminal({
        fontSize: 12,
        fontFamily:
          "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
        theme: {
          background: '#0d0d0d',
          foreground: '#e8e8e8',
          cursor: '#FFD700',
          selectionBackground: 'rgba(255, 215, 0, 0.2)',
          black: '#1a1a1a',
          red: '#ef5350',
          green: '#4caf50',
          yellow: '#FFD700',
          blue: '#00bcd4',
          magenta: '#ab47bc',
          cyan: '#00bcd4',
          white: '#e8e8e8',
          brightBlack: '#666666',
          brightRed: '#ff7043',
          brightGreen: '#66bb6a',
          brightYellow: '#FFE44D',
          brightBlue: '#26c6da',
          brightMagenta: '#ce93d8',
          brightCyan: '#26c6da',
          brightWhite: '#ffffff',
        },
        cursorBlink: true,
        cursorStyle: 'bar',
        allowProposedApi: true,
        scrollback: 5000,
      })

      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())

      if (terminalRef.current && !disposed) {
        terminal.open(terminalRef.current)
        fitAddon.fit()
      }

      xtermRef.current = terminal
      fitAddonRef.current = fitAddon

      // 通知 Effect 2：xterm 已就绪，可以开始连接
      setTerminalReady(true)
    }

    initTerminal()

    return () => {
      disposed = true
      terminal?.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      setTerminalReady(false)
    }
  }, []) // 空依赖 — 只创建一次

  /**
   * Effect 2: 连接管理
   *
   * 根据可用连接方式选择策略，连接断开时自动降级。
   * 清理连接时不销毁终端实例，保留历史记录。
   *
   * 依赖 terminalReady 确保在 xterm 实例创建完成后才连接，
   * 解决异步初始化的竞态条件。
   *
   * 连接优先级：
   * 1. 本地 PTY（通过 IPC 桥接 node-pty）— 优先
   * 2. CLI WebSocket PTY — 降级
   * 3. 本地模拟模式 — 最终降级
   */
  useEffect(() => {
    if (!terminalReady) return

    const terminal = xtermRef.current
    if (!terminal) return

    // 清理上一次连接的所有 disposable
    disposablesRef.current.forEach((d) => d.dispose())
    disposablesRef.current = []

    let ws: WebSocket | null = null

    // 先异步检查 PTY 是否真正可用（IPC handler 是否存在）
    const initConnection = async () => {
      let ptyAvailable = false
      if (window.api?.pty) {
        try {
          ptyAvailable = await window.api.pty.isAvailable()
        } catch {
          // IPC handler 不存在，PTY 不可用
          ptyAvailable = false
        }
      }

      if (ptyAvailable) {
        connectLocalPty(terminal, ptyIdRef.current, disposablesRef)
      } else if (connected) {
        // 降级：使用 CLI WebSocket PTY
        ws = connectWebSocket(terminal, port, disposablesRef)
      } else {
        // 最终降级：本地模拟模式
        startLocalMode(terminal, disposablesRef)
      }
    }

    initConnection()

    return () => {
      // 清理连接，不销毁终端
      ws?.close()
      // Kill 旧 PTY 实例并生成新 ID，避免 "already exists" 错误
      if (window.api?.pty) {
        try { window.api.pty.kill(ptyIdRef.current) } catch { /* 忽略不存在的实例 */ }
      }
      ptyIdRef.current = `pty-${Date.now()}`
      disposablesRef.current.forEach((d) => d.dispose())
      disposablesRef.current = []
    }
  }, [connected, port, terminalReady])

  /**
   * Effect 3: 容器尺寸适配
   *
   * 使用 ResizeObserver 替代 window.resize，
   * 可感知容器自身尺寸变化（如抽屉展开/折叠）。
   */
  useEffect(() => {
    const container = terminalRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      fitAddonRef.current?.fit()
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  /** 监听抽屉展开后的终端适配事件 */
  useEffect(() => {
    const handleFit = () => {
      fitAddonRef.current?.fit()
    }
    window.addEventListener('terminal:fit', handleFit)
    return () => window.removeEventListener('terminal:fit', handleFit)
  }, [])

  return (
    <div className="h-full w-full bg-[#0d0d0d] p-1">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  )
}

/**
 * 连接本地 PTY（通过 IPC 桥接 node-pty）
 *
 * 双向数据流：
 * - 终端输入 → IPC → node-pty
 * - node-pty → IPC → 终端输出
 */
function connectLocalPty(
  terminal: any,
  ptyId: string,
  disposablesRef: React.MutableRefObject<IDisposable[]>,
): void {
  const api = window.api!.pty

  terminal.writeln('\x1b[33m⬤ KiloCode Terminal (Local PTY)\x1b[0m')
  terminal.writeln('')

  // 监听 PTY 输出
  api.onData((id: string, data: string) => {
    if (id === ptyId) {
      terminal.write(data)
    }
  })

  // 监听 PTY 退出
  api.onExit((id: string, exitCode: number) => {
    if (id === ptyId) {
      terminal.writeln('')
      terminal.writeln(`\x1b[31m⬤ Shell exited (code: ${exitCode})\x1b[0m`)
    }
  })

  // 终端输入发送到 PTY
  const dataDisposable = terminal.onData((data: string) => {
    api.write(ptyId, data)
  })
  disposablesRef.current.push(dataDisposable)

  // 终端大小变化时通知 PTY
  const resizeDisposable = terminal.onResize(
    ({ cols, rows }: { cols: number; rows: number }) => {
      api.resize(ptyId, cols, rows)
    },
  )
  disposablesRef.current.push(resizeDisposable)

  // 创建 PTY 实例
  api.create(ptyId, terminal.cols, terminal.rows).catch((err: unknown) => {
    terminal.writeln(`\x1b[31m⬤ Failed to create PTY: ${err}\x1b[0m`)
    terminal.writeln('  降级到本地模拟模式...')
    startLocalMode(terminal, disposablesRef)
  })
}

/**
 * 连接 WebSocket PTY
 *
 * 双向数据流：
 * - 终端输入 → WebSocket → CLI PTY
 * - CLI PTY → WebSocket → 终端输出
 *
 * @returns WebSocket 实例，供调用方在 cleanup 时关闭
 */
function connectWebSocket(
  terminal: any,
  port: number,
  disposablesRef: React.MutableRefObject<IDisposable[]>,
): WebSocket | null {
  try {
    const ws = new WebSocket(`ws://localhost:${port}/pty`)

    ws.onopen = () => {
      terminal.writeln('\x1b[33m⬤ KiloCode Terminal (Connected)\x1b[0m')
      terminal.writeln('')
    }

    ws.onmessage = (event) => {
      const data = event.data
      if (typeof data === 'string') {
        terminal.write(data)
      }
    }

    ws.onclose = () => {
      terminal.writeln('')
      terminal.writeln('\x1b[31m⬤ Connection closed\x1b[0m')
    }

    ws.onerror = () => {
      terminal.writeln('\x1b[31m⬤ WebSocket connection error\x1b[0m')
    }

    // 终端输入发送到 WebSocket
    const dataDisposable = terminal.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })
    disposablesRef.current.push(dataDisposable)

    // 终端大小变化时通知 PTY
    const resizeDisposable = terminal.onResize(
      ({ cols, rows }: { cols: number; rows: number }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }))
        }
      },
    )
    disposablesRef.current.push(resizeDisposable)

    return ws
  } catch (err) {
    terminal.writeln(`\x1b[31m⬤ Failed to connect: ${err}\x1b[0m`)
    return null
  }
}

/** 本地模式命令处理 */
function handleLocalCommand(terminal: any, cmd: string) {
  if (!cmd) return

  const parts = cmd.split(/\s+/)
  const command = parts[0].toLowerCase()

  switch (command) {
    case 'help':
      terminal.writeln('\x1b[36m  可用命令:\x1b[0m')
      terminal.writeln('    help     - 显示帮助信息')
      terminal.writeln('    clear    - 清屏')
      terminal.writeln('    date     - 显示日期时间')
      terminal.writeln('    echo     - 回显文本')
      terminal.writeln('    whoami   - 显示用户信息')
      break
    case 'clear':
      terminal.clear()
      break
    case 'date':
      terminal.writeln(`  ${new Date().toLocaleString('zh-CN')}`)
      break
    case 'echo':
      terminal.writeln(`  ${parts.slice(1).join(' ')}`)
      break
    case 'whoami':
      terminal.writeln('  KiloCode User')
      break
    default:
      terminal.writeln(`\x1b[31m  未知命令: ${command}\x1b[0m`)
      terminal.writeln('  输入 help 查看可用命令')
  }
}

/**
 * 本地模拟模式
 *
 * 无 PTY 和 WebSocket 连接时的最终降级方案，
 * 提供基本交互式命令体验。
 */
function startLocalMode(
  terminal: any,
  disposablesRef: React.MutableRefObject<IDisposable[]>,
): void {
  terminal.writeln('\x1b[33m⬤ KiloCode Terminal\x1b[0m')
  terminal.writeln('')
  terminal.writeln('  连接 KiloCode CLI 后可使用交互式终端')
  terminal.writeln('  终端会通过 WebSocket PTY 连接到 CLI 服务')
  terminal.writeln('')
  terminal.writeln('  \x1b[36m可用命令（本地模式）:\x1b[0m')
  terminal.writeln('    help     - 显示帮助信息')
  terminal.writeln('    clear    - 清屏')
  terminal.writeln('    date     - 显示日期时间')
  terminal.writeln('')

  let lineBuffer = ''
  terminal.write('\x1b[32m$\x1b[0m ')

  const dataDisposable = terminal.onData((data: string) => {
    if (data === '\r') {
      // Enter
      terminal.writeln('')
      handleLocalCommand(terminal, lineBuffer.trim())
      lineBuffer = ''
      terminal.write('\x1b[32m$\x1b[0m ')
    } else if (data === '\x7f') {
      // Backspace
      if (lineBuffer.length > 0) {
        lineBuffer = lineBuffer.slice(0, -1)
        terminal.write('\b \b')
      }
    } else if (data === '\x03') {
      // Ctrl+C
      terminal.writeln('^C')
      lineBuffer = ''
      terminal.write('\x1b[32m$\x1b[0m ')
    } else if (data >= ' ') {
      // 可打印字符
      lineBuffer += data
      terminal.write(data)
    }
  })
  disposablesRef.current.push(dataDisposable)
}
