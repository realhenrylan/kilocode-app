import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { KiloProcess } from './kilo-process'
import { registerIpcHandlers } from './ipc-handlers'
import { createTray, destroyTray } from './tray'
import { registerGlobalShortcuts, registerAppShortcuts, unregisterAllShortcuts } from './shortcuts'

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null

/** KiloCode CLI 进程管理器 */
let kiloProcess: KiloProcess | null = null

function createWindow(): void {
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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 关闭时最小化到托盘而非退出
  mainWindow.on('close', (event) => {
    if (app.tray) {
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
  mainWindow.webContents.on('crashed', (event, killed) => {
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
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
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
    const tray = createTray(mainWindow)
    app.tray = tray as any
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
  kiloProcess?.stop()
  destroyTray()
  unregisterAllShortcuts()
})
