import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

/**
 * 自动更新模块
 *
 * 使用 electron-updater 实现自动检查和安装更新
 * 支持 GitHub Releases 分发
 */
export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // 检查更新时通知渲染进程
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update:checking')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  // 当前已是最新版本
  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:not-available')
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  // 下载完成，可以安装
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })

  // 更新错误
  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update:error', err.message)
  })

  // 自动下载更新
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // 启动后延迟 5 秒检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // 静默处理检查失败
    })
  }, 5000)

  // 每小时检查一次更新
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 60 * 60 * 1000)
}

/** 手动检查更新 */
export async function checkForUpdates(): Promise<void> {
  await autoUpdater.checkForUpdates()
}

/** 安装已下载的更新并重启 */
export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
