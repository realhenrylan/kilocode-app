import { useEffect, useRef } from 'react'
import { useConnectionStore } from '@/stores/connectionStore'

/**
 * 终端面板组件
 *
 * 基于 xterm.js 的集成终端
 * 通过 WebSocket 连接 KiloCode CLI 的 PTY 端点
 * 支持交互式命令执行
 */
export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const { connected, port } = useConnectionStore()

  useEffect(() => {
    if (!terminalRef.current) return

    let terminal: any
    let fitAddon: any

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      const { WebLinksAddon } = await import('@xterm/addon-web-links')

      terminal = new Terminal({
        fontSize: 12,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
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

      if (terminalRef.current) {
        terminal.open(terminalRef.current)
        fitAddon.fit()

        // 连接 WebSocket PTY
        if (connected) {
          connectWebSocket(terminal, port)
        } else {
          // 未连接时显示提示
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

          // 本地模式：提供基本交互
          let lineBuffer = ''
          terminal.write('\x1b[32m$\x1b[0m ')
          terminal.onData((data: string) => {
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
        }
      }

      xtermRef.current = terminal

      // 窗口大小变化时重新适配
      const handleResize = () => fitAddon?.fit()
      window.addEventListener('resize', handleResize)
    }

    initTerminal()

    return () => {
      wsRef.current?.close()
      terminal?.dispose()
      xtermRef.current = null
    }
  }, [connected, port])

  return (
    <div className="h-full w-full bg-[#0d0d0d] p-1">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  )
}

/**
 * 连接 WebSocket PTY
 *
 * 双向数据流：
 * - 终端输入 → WebSocket → CLI PTY
 * - CLI PTY → WebSocket → 终端输出
 */
function connectWebSocket(terminal: any, port: number) {
  try {
    const ws = new WebSocket(`ws://localhost:${port}/pty`)

    ws.onopen = () => {
      terminal.writeln('\x1b[33m⬤ KiloCode Terminal (Connected)\x1b[0m')
      terminal.writeln('')
    }

    ws.onmessage = (event) => {
      // PTY 输出写入终端
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
    terminal.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    // 终端大小变化时通知 PTY
    terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })
  } catch (err) {
    terminal.writeln(`\x1b[31m⬤ Failed to connect: ${err}\x1b[0m`)
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
