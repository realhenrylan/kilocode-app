import { app, BrowserWindow, shell, Tray } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { KiloProcess } from './kilo-process'
import { registerIpcHandlers } from './ipc-handlers'
import { createTray, destroyTray } from './tray'
import { registerGlobalShortcuts, registerAppShortcuts, unregisterAllShortcuts } from './shortcuts'

/**
 * ESM 兼容：package.json 设置了 "type": "module"，
 * Node.js ESM 中不提供 __dirname/__filename，需手动从 import.meta.url 派生
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null
let systemTray: Tray | null = null

/** KiloCode CLI 进程管理器 */
let kiloProcess: KiloProcess | null = null

function createWindow(): void {
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1a1a1a',
        symbolColor: '#999999',
        height: 36,
      },
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
    })

    // 关闭时最小化到托盘而非退出（仅当托盘存在时）
    mainWindow.on('close', (event) => {
      if (systemTray && !(app as any).isQuitting) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })

    // 外部链接在系统浏览器中打开
    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 注册应用内快捷键
    registerAppShortcuts(mainWindow)

    // ===== 崩溃恢复 =====
    // 渲染进程崩溃后自动重载
    ;(mainWindow.webContents as any).on('crashed', (_event: unknown, killed: boolean) => {
      if (killed) {
        // 进程被主动杀死，不自动恢复
        console.warn('[main] Renderer process was killed, not auto-recovering')
        return
      }
      console.error('[main] Renderer process crashed, attempting recovery...')
      // 延迟 2 秒后重载窗口，前端 persist 会自动恢复状态
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload()
          console.log('[main] Renderer reloaded for crash recovery')
        }
      }, 2000)
    })

    // 渲染进程无响应时记录警告
    mainWindow.webContents.on('unresponsive', () => {
      console.warn('[main] Renderer process became unresponsive')
    })

    mainWindow.webContents.on('responsive', () => {
      console.log('[main] Renderer process became responsive again')
    })

    // 开发模式加载 dev server，生产模式加载打包文件
    // vite-plugin-electron 通过 VITE_DEV_SERVER_URL 传递 dev server 地址
    // 兼容旧版 ELECTRON_RENDERER_URL；若均未设置则尝试默认端口
    const devServerUrl =
      process.env['VITE_DEV_SERVER_URL'] ||
      process.env['ELECTRON_RENDERER_URL'] ||
      (is.dev ? 'http://localhost:5173' : '')
    if (is.dev && devServerUrl) {
      mainWindow.loadURL(devServerUrl)
    } else {
      mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }
  } catch (err) {
    console.error('[main] Failed to create window:', err)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.kilocode.desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 启动 KiloCode CLI 进程
  kiloProcess = new KiloProcess()
  kiloProcess.start().then((port) => {
    console.log(`KiloCode CLI started on port ${port}`)
  }).catch((err) => {
    console.error('Failed to start KiloCode CLI:', err)
  })

  // 注册 IPC 通信处理
  registerIpcHandlers(kiloProcess)

  // 创建主窗口
  createWindow()

  // 创建系统托盘
  if (mainWindow) {
    systemTray = createTray(mainWindow)
  }

  // 注册全局快捷键
  if (mainWindow) {
    registerGlobalShortcuts(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// 所有窗口关闭时退出（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    kiloProcess?.stop()
    destroyTray()
    unregisterAllShortcuts()
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  ;(app as any).isQuitting = true
  kiloProcess?.stop()
  destroyTray()
  unregisterAllShortcuts()
})
