import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'

/**
 * 系统托盘管理
 *
 * 最小化到托盘、托盘菜单操作
 */
let tray: Tray | null = null

/** 官方 Kilo Code mark（来源：Kilo-Org/kilocode） */
const KILO_MARK_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M512 0H0V512H512V0Z" fill="black"/>
  <path d="M322 377H377V421H307.857L278 391.143V322H322V377ZM421 307.857L391.143 278H322V322L377 322V377H421V307.857ZM234 278H190V322H234V278ZM91 391.143L120.857 421H234V377H135V278H91V391.143ZM371.172 189.999V120.856L341.315 90.9995H278V135H327.172V189.999H278V233.999H421V189.999H371.172ZM135 91H91V233.999H135V184.5H190V233.999H234V184.5L190 140.5H135V91ZM234 91H190V140.5H234V91Z" fill="#FAF74F"/>
</svg>`

export function createTray(mainWindow: BrowserWindow): Tray {
  // Windows 托盘对 SVG 的支持不稳定，优先使用 PNG。开发环境和打包后的资源路径不同。
  const iconPaths = [
    join(process.resourcesPath, 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.png'),
  ]
  let icon = nativeImage.createEmpty()

  for (const iconPath of iconPaths) {
    const candidate = nativeImage.createFromPath(iconPath)
    if (!candidate.isEmpty()) {
      icon = candidate
      break
    }
  }

  // 资源读取失败时仍保留内嵌图标，避免托盘创建失败。
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      'data:image/svg+xml;base64,' +
      Buffer.from(KILO_MARK_SVG).toString('base64')
    )
  }

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
