import { app, BrowserWindow, globalShortcut } from 'electron'

/**
 * 全局快捷键注册
 *
 * 注册系统级热键，即使应用不在焦点也能响应
 */
export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  // Ctrl+Shift+K: 显示/隐藏 KiloCode 窗口
  globalShortcut.register('CommandOrControl+Shift+K', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

/**
 * 注册应用内快捷键
 * 在窗口获得焦点时生效
 */
export function registerAppShortcuts(mainWindow: BrowserWindow): void {
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl+N: 新建会话
    if (input.control && input.key === 'n' && !input.shift) {
      mainWindow.webContents.send('action:newSession')
    }
    // Ctrl+Shift+N: 新建窗口
    if (input.control && input.shift && input.key === 'N') {
      // TODO: 多窗口支持
    }
    // Ctrl+B: 切换侧边栏
    if (input.control && input.key === 'b') {
      mainWindow.webContents.send('action:toggleSidebar')
    }
    // Ctrl+J: 切换终端面板
    if (input.control && input.key === 'j') {
      mainWindow.webContents.send('action:toggleTerminal')
    }
    // Ctrl+,: 打开设置
    if (input.control && input.key === ',') {
      mainWindow.webContents.send('action:openSettings')
    }
  })
}

/** 注销所有全局快捷键 */
export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
}
