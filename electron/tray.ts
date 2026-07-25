import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'

/**
 * 系统托盘管理
 *
 * 最小化到托盘、托盘菜单操作
 */
let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  // 创建托盘图标（16x16 品牌黄色方块）
  const icon = nativeImage.createFromDataURL(
    'data:image/svg+xml;base64,' +
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <rect width="16" height="16" rx="3" fill="#FFD700"/>
      <text x="8" y="12" font-size="10" font-weight="bold" text-anchor="middle" fill="black">K</text>
    </svg>`).toString('base64')
  )

  tray = new Tray(icon)
  tray.setToolTip('KiloCode')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 KiloCode',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: '新建会话',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('action:newSession')
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // 点击托盘图标显示窗口
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
