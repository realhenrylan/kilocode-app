import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import type { KiloProcess } from './kilo-process'
import type { PtyManager } from './pty-manager'

/**
 * 注册所有 IPC 通信处理器
 *
 * 主进程与渲染进程之间的通信桥梁，处理：
 * - KiloCode CLI 状态查询与控制
 * - 窗口控制（最小化/最大化/关闭）
 * - 文件系统操作
 * - PTY 终端操作
 */
export function registerIpcHandlers(kiloProcess: KiloProcess | null, ptyManager: PtyManager): void {
  // ===== KiloCode CLI 相关 =====

  ipcMain.handle('kilo:getPort', () => {
    return kiloProcess?.port ?? 4096
  })

  ipcMain.handle('kilo:isReady', () => {
    return kiloProcess?.ready ?? false
  })

  ipcMain.handle('kilo:restart', async () => {
    if (!kiloProcess) throw new Error('KiloProcess not initialized')
    return kiloProcess.restart()
  })

  // ===== 窗口控制 =====

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:isMaximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  // 监听窗口最大化状态变化，通知渲染进程
  BrowserWindow.getAllWindows().forEach((win) => {
    win.on('maximize', () => {
      win.webContents.send('window:maximizeChanged', true)
    })
    win.on('unmaximize', () => {
      win.webContents.send('window:maximizeChanged', false)
    })
  })

  // ===== 文件系统操作 =====

  ipcMain.handle('fs:selectDirectory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: '选择项目目录',
    })
    if (result.canceled) return null
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    return readFile(filePath, 'utf-8')
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    return writeFile(filePath, content, 'utf-8')
  })

  // ===== PTY 终端相关 =====
  // pty:isAvailable 始终注册，让渲染进程可以正确检测 PTY 可用性
  ipcMain.handle('pty:isAvailable', () => ptyManager.available)

  // 仅在 node-pty 原生模块可用时注册 PTY IPC 通道
  if (ptyManager.available) {
    // PTY 输出推送到所有窗口（监听器只注册一次，避免重复）
    ptyManager.on('data', (ptyId: string, data: string) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('pty:data', ptyId, data)
      })
    })
    ptyManager.on('exit', (ptyId: string, exitCode: number) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('pty:exit', ptyId, exitCode)
      })
    })

    ipcMain.handle('pty:create', (event, { id, cols, rows, cwd }) => {
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
}
