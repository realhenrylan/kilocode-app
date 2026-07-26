import { useUiStore } from '@/stores/uiStore'
import { useSessionStore } from '@/stores/sessionStore'
import { SessionList } from '@/components/sidebar/SessionList'
import { ProjectPicker } from '@/components/sidebar/ProjectPicker'
import {
  Settings,
  Plus,
  Search,
} from 'lucide-react'
import { useState } from 'react'

/**
 * 左侧边栏（Codex V2.3 瘦身版）
 *
 * 模式/模型选择器已迁入 Composer 底部胶囊
 * 侧边栏只保留：Logo、新建任务、搜索、会话列表、底部项目+操作
 * 宽度 256px，Logo 使用 KiloCode 官方 logo
 */
export function Sidebar() {
  const { setSettingsOpen } = useUiStore()
  const { createNewSession } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="kc-sidebar">
      {/* Logo + 新建任务 + 搜索 */}
      <div className="kc-side-nav">
        {/* Logo */}
        <div className="kc-side-logo">
          {/* KiloCode 官方 logo：来自 kilo.ai/kilo-v4.svg */}
          <div className="h-[22px] w-[22px] flex-shrink-0">
            <img src="/kilo-logo.svg" alt="KiloCode" className="h-full w-full object-contain" />
          </div>
          <span>KiloCode</span>
        </div>

        {/* 新建任务按钮 */}
        <button onClick={createNewSession} className="kc-new-task">
          <Plus size={13} className="text-[var(--text-secondary)]" />
          <span>新建任务</span>
        </button>

        <label className="kc-side-search">
          <Search size={13} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索会话"
            aria-label="搜索会话"
          />
        </label>
      </div>

      {/* 会话列表 */}
      <div className="kc-side-list">
        <SessionList searchQuery={searchQuery} />
      </div>

      {/* 底部区域 */}
      <div className="kc-side-bottom">
        {/* 项目选择 */}
        <ProjectPicker />

        <button className="kc-side-row" type="button" onClick={() => setSettingsOpen(true)}>
          <Settings size={13} />
          <span>设置</span>
          <span className="kc-side-meta">↑ 24.1k tokens</span>
        </button>
      </div>
    </div>
  )
}
