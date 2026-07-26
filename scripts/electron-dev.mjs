#!/usr/bin/env node

/**
 * Electron 开发模式启动器
 *
 * 解决 vite-plugin-electron 在 Windows 上的环境变量传递问题：
 * vite-plugin-electron 通过 process.env.VITE_DEV_SERVER_URL 传递 dev server 地址，
 * 但 Electron 子进程在某些情况下无法获取该环境变量，导致窗口显示 Error。
 *
 * 本脚本先启动 vite dev server（含 electron 插件用于构建主进程代码），
 * 等待其就绪后，显式设置 VITE_DEV_SERVER_URL 再启动 Electron。
 */

import { spawn } from 'child_process'
import { createServer } from 'net'

const VITE_PORT = 5173
const VITE_HOST = 'localhost'
const MAX_WAIT_SECONDS = 30

/** 检查端口是否已被占用 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port, VITE_HOST)
  })
}

/** 等待 vite dev server 就绪 */
async function waitForVite(port, maxWaitSeconds) {
  const url = `http://${VITE_HOST}:${port}`
  const startTime = Date.now()

  while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
    try {
      const response = await fetch(url)
      if (response.ok) return url
    } catch {
      // 还没就绪，继续等待
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  throw new Error(`Vite dev server did not start within ${maxWaitSeconds} seconds`)
}

async function main() {
  let viteProcess = null

  // 检查 vite 是否已在运行
  const portInUse = await isPortInUse(VITE_PORT)

  if (!portInUse) {
    console.log('[electron-dev] Starting vite dev server (with electron plugin for main process build)...')
    // 使用 vite 启动 dev server，vite-plugin-electron 会自动构建 electron 主进程代码
    // 设置 ELECTRON_STARTUP_PREVENT 阻止 vite-plugin-electron 自动启动 Electron
    // 我们在 vite 就绪后手动启动，确保 VITE_DEV_SERVER_URL 正确传递
    viteProcess = spawn('npx', ['vite', '--port', String(VITE_PORT)], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        ELECTRON_STARTUP_PREVENT: '1',
      },
    })

    viteProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[electron-dev] Vite exited with code ${code}`)
        process.exit(code)
      }
    })
  } else {
    console.log(`[electron-dev] Vite already running on port ${VITE_PORT}`)
  }

  // 等待 vite 就绪（同时 electron 主进程代码也会被构建到 dist-electron/）
  const devServerUrl = await waitForVite(VITE_PORT, MAX_WAIT_SECONDS)
  console.log(`[electron-dev] Vite ready at ${devServerUrl}`)

  // 额外等待确保 electron 主进程代码已构建完成
  await new Promise((r) => setTimeout(r, 2000))

  // 启动 Electron，显式传递 dev server URL
  console.log('[electron-dev] Starting Electron with VITE_DEV_SERVER_URL=' + devServerUrl)
  const electronProcess = spawn('npx', ['electron', 'dist-electron/main.js'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  })

  electronProcess.on('exit', (code) => {
    console.log(`[electron-dev] Electron exited with code ${code}`)
    if (viteProcess && !viteProcess.killed) {
      viteProcess.kill('SIGTERM')
    }
    process.exit(code ?? 0)
  })

  // 处理 Ctrl+C
  process.on('SIGINT', () => {
    console.log('[electron-dev] Shutting down...')
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill('SIGTERM')
    }
    if (viteProcess && !viteProcess.killed) {
      viteProcess.kill('SIGTERM')
    }
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[electron-dev] Fatal error:', err)
  process.exit(1)
})
