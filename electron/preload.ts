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

  /** PTY 终端操作 */
  pty: {
    /** 检查 PTY（node-pty）是否可用 */
    isAvailable: (): Promise<boolean> => ipcRenderer.invoke('pty:isAvailable'),
    /** 创建 PTY 实例 */
    create: (id: string, cols: number, rows: number, cwd?: string): Promise<void> =>
      ipcRenderer.invoke('pty:create', { id, cols, rows, cwd }),
    /** 向 PTY 写入数据（用户输入） */
    write: (id: string, data: string): void => ipcRenderer.send('pty:write', { id, data }),
    /** 调整 PTY 尺寸 */
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('pty:resize', { id, cols, rows }),
    /** 杀死 PTY 进程 */
    kill: (id: string): void => ipcRenderer.send('pty:kill', { id }),
    /** 监听 PTY 输出数据 */
    onData: (callback: (id: string, data: string) => void) => {
      ipcRenderer.on('pty:data', (_, id, data) => callback(id, data))
    },
    /** 监听 PTY 退出事件 */
    onExit: (callback: (id: string, exitCode: number) => void) => {
      ipcRenderer.on('pty:exit', (_, id, exitCode) => callback(id, exitCode))
    },
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
  ;(globalThis as any).window.electron = electronAPI
  ;(globalThis as any).window.api = api
}
