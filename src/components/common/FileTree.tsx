import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn'
import type { FileNode } from '@/types/kilo'
import { File, Folder, FolderOpen, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react'
import { useSessionStore } from '@/stores/sessionStore'
import { kiloApi } from '@/services/kiloClient'
import { useConnectionStore } from '@/stores/connectionStore'

/**
 * 文件树组件
 *
 * 通过 API 加载项目目录结构并递归渲染
 * 支持展开/折叠目录、点击文件查看内容
 */
export function FileTree() {
  const { workingDir } = useSessionStore()
  const { connected } = useConnectionStore()
  const [tree, setTree] = useState<FileNode[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  /** 加载根目录 */
  const loadRoot = useCallback(async () => {
    if (!workingDir) return
    setLoading(true)
    try {
      if (connected) {
        const files = await kiloApi.listFiles(workingDir)
        const nodes = files.map((name) => ({
          name: name.split('/').pop() || name,
          path: name,
          type: name.endsWith('/') ? 'directory' as const : 'file' as const,
        }))
        setTree(nodes.sort((a, b) => {
          // 目录优先，然后按名称排序
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
          return a.name.localeCompare(b.name)
        }))
      } else {
        // 未连接时使用模拟数据
        setTree(getSimulatedTree())
      }
    } catch {
      setTree(getSimulatedTree())
    }
    setLoading(false)
  }, [workingDir, connected])

  useEffect(() => {
    loadRoot()
  }, [loadRoot])

  const toggleDir = async (path: string) => {
    const next = new Set(expandedDirs)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
      // 加载子目录内容
      try {
        if (connected) {
          const files = await kiloApi.listFiles(path)
          // 更新对应节点的 children
          updateChildren(path, files.map((name) => ({
            name: name.split('/').pop() || name,
            path: name,
            type: name.endsWith('/') ? 'directory' as const : 'file' as const,
          })))
        }
      } catch {
        // 加载失败不阻塞展开
      }
    }
    setExpandedDirs(next)
  }

  const updateChildren = (parentPath: string, children: FileNode[]) => {
    setTree((prev) => updateNodeChildren(prev, parentPath, children))
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-medium text-[var(--text-tertiary)]">项目文件</span>
        <button
          onClick={loadRoot}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          aria-label="刷新"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto p-1 text-xs">
        {tree.length > 0 ? (
          tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expanded={expandedDirs}
              onToggle={toggleDir}
            />
          ))
        ) : (
          <p className="px-2 py-4 text-center text-[10px] text-[var(--text-tertiary)]">
            {workingDir ? '加载中...' : '选择项目目录以浏览文件'}
          </p>
        )}
      </div>
    </div>
  )
}

/** 递归更新节点 children */
function updateNodeChildren(nodes: FileNode[], parentPath: string, children: FileNode[]): FileNode[] {
  return nodes.map((node) => {
    if (node.path === parentPath) {
      return { ...node, children }
    }
    if (node.children) {
      return { ...node, children: updateNodeChildren(node.children, parentPath, children) }
    }
    return node
  })
}

/** 文件树节点渲染 */
function FileTreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: FileNode
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
}) {
  const isDir = node.type === 'directory'
  const isExpanded = expanded.has(node.path)

  return (
    <div>
      <button
        onClick={() => isDir && onToggle(node.path)}
        className={cn(
          'flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs transition-colors hover:bg-[var(--bg-hover)]',
          isDir && 'text-[var(--text-secondary)]',
          !isDir && 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isDir ? (
          <>
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {isExpanded ? <FolderOpen size={12} className="text-[var(--brand-primary)]" /> : <Folder size={12} />}
          </>
        ) : (
          <>
            <span className="w-2.5" />
            <File size={12} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && isExpanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

/** 模拟文件树（未连接 CLI 时） */
function getSimulatedTree(): FileNode[] {
  return [
    { name: 'src', path: 'src', type: 'directory', children: [
      { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      { name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
      { name: 'components', path: 'src/components', type: 'directory', children: [
        { name: 'layout', path: 'src/components/layout', type: 'directory', children: [
          { name: 'AppShell.tsx', path: 'src/components/layout/AppShell.tsx', type: 'file' },
          { name: 'Sidebar.tsx', path: 'src/components/layout/Sidebar.tsx', type: 'file' },
          { name: 'MainPanel.tsx', path: 'src/components/layout/MainPanel.tsx', type: 'file' },
        ]},
        { name: 'chat', path: 'src/components/chat', type: 'directory', children: [
          { name: 'ChatPanel.tsx', path: 'src/components/chat/ChatPanel.tsx', type: 'file' },
          { name: 'Composer.tsx', path: 'src/components/chat/Composer.tsx', type: 'file' },
        ]},
      ]},
      { name: 'stores', path: 'src/stores', type: 'directory', children: [
        { name: 'sessionStore.ts', path: 'src/stores/sessionStore.ts', type: 'file' },
        { name: 'uiStore.ts', path: 'src/stores/uiStore.ts', type: 'file' },
      ]},
    ]},
    { name: 'electron', path: 'electron', type: 'directory', children: [
      { name: 'main.ts', path: 'electron/main.ts', type: 'file' },
      { name: 'preload.ts', path: 'electron/preload.ts', type: 'file' },
    ]},
    { name: 'package.json', path: 'package.json', type: 'file' },
    { name: 'README.md', path: 'README.md', type: 'file' },
    { name: 'CHANGELOG.md', path: 'CHANGELOG.md', type: 'file' },
  ]
}
