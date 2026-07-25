import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * 自定义 API 暴露给渲染进程
 * 通过 window.api 访问
 */
const api = {
  /** KiloCode CLI 相关操作 */
  kilo: {
    /** 获取 CLI 服务端口 */
    getPort: (): Promise<number> => ipcRenderer.invoke('kilo:getPort'),
    /** 检查 CLI 是否就绪 */
    isReady: (): Promise<boolean> => ipcRenderer.invoke('kilo:isReady'),
    /** 重启 CLI 服务 */
    restart: (): Promise<number> => ipcRenderer.invoke('kilo:restart'),
  },

  /** 窗口控制 */
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximizeChanged', (_, maximized) => callback(maximized))
    },
  },

  /** 文件系统操作 */
  fs: {
    /** 选择目录 */
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('fs:selectDirectory'),
    /** 读取文件内容 */
    readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:readFile', filePath),
    /** 写入文件 */
    writeFile: (filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
  },

  /** 事件监听 */
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },

  /** 移除事件监听 */
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback as never)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error 非隔离模式下的回退
  window.electron = electronAPI
  // @ts-expect-error
  window.api = api
}
