import { useMemo } from 'react'
import { cn } from '@/utils/cn'

/**
 * Diff 查看器组件
 *
 * 解析 unified diff 文本并渲染，支持：
 * - 新增行（绿色背景）/ 删除行（红色背景）/ 上下文行
 * - 行号显示（旧/新）
 * - 折叠区块头
 * - 语法高亮（通过 CSS class）
 */
export function DiffViewer() {
  // 占位提示：实际使用时通过 props 或 store 传入 diff 内容
  return (
    <div className="h-full overflow-y-auto p-2 text-xs">
      <DiffContent diffText={sampleDiff} />
    </div>
  )
}

interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header' | 'nodiff'
  content: string
  oldNum?: number
  newNum?: number
}

interface DiffHunk {
  header: string
  lines: DiffLine[]
}

/**
 * 解析 unified diff 文本为结构化数据
 *
 * 支持标准 unified diff 格式：
 * --- a/file.ts
 * +++ b/file.ts
 * @@ -1,5 +1,7 @@
 *  context line
 * -deleted line
 * +added line
 */
export function parseDiff(diffText: string): DiffHunk[] {
  if (!diffText.trim()) return []

  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let oldLine = 0
  let newLine = 0

  const lines = diffText.split('\n')

  for (const line of lines) {
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/)
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10)
      newLine = parseInt(hunkMatch[2], 10)
      currentHunk = { header: line, lines: [] }
      hunks.push(currentHunk)
      continue
    }

    // File header: --- a/file or +++ b/file
    if (line.startsWith('--- ') || line.startsWith('+++ ')) {
      continue
    }

    if (!currentHunk) {
      // diff 前的文本，创建一个默认 hunk
      currentHunk = { header: '', lines: [] }
      hunks.push(currentHunk)
    }

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1),
        newNum: newLine++,
      })
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'delete',
        content: line.slice(1),
        oldNum: oldLine++,
      })
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1),
        oldNum: oldLine++,
        newNum: newLine++,
      })
    } else {
      currentHunk.lines.push({
        type: 'context',
        content: line,
        oldNum: oldLine++,
        newNum: newLine++,
      })
    }
  }

  return hunks
}

/** 渲染 Diff 内容 */
function DiffContent({ diffText }: { diffText: string }) {
  const hunks = useMemo(() => parseDiff(diffText), [diffText])

  if (hunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
        <p className="text-xs">无差异内容</p>
      </div>
    )
  }

  return (
    <div className="font-mono">
      {hunks.map((hunk, i) => (
        <div key={i}>
          {/* Hunk header */}
          {hunk.header && (
            <div className="sticky top-0 bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] text-[var(--accent)] border-b border-[var(--border-subtle)]">
              {hunk.header}
            </div>
          )}
          {/* Lines */}
          {hunk.lines.map((line, j) => (
            <DiffLineRow key={j} line={line} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** 单行 Diff 渲染 */
function DiffLineRow({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        'flex',
        line.type === 'add' && 'bg-[var(--diff-add-bg)]',
        line.type === 'delete' && 'bg-[var(--diff-del-bg)]',
        line.type === 'header' && 'bg-[var(--bg-tertiary)] text-[var(--accent)]',
      )}
    >
      {/* 旧行号 */}
      <span className="w-10 flex-shrink-0 select-none text-right text-[var(--text-tertiary)]">
        {line.oldNum ?? ''}
      </span>
      {/* 新行号 */}
      <span className="w-10 flex-shrink-0 select-none text-right text-[var(--text-tertiary)]">
        {line.newNum ?? ''}
      </span>
      {/* 变更标记 */}
      <span
        className={cn(
          'w-5 flex-shrink-0 select-none text-center',
          line.type === 'add' && 'text-[var(--diff-add-text)]',
          line.type === 'delete' && 'text-[var(--diff-del-text)]',
        )}
      >
        {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
      </span>
      {/* 内容 */}
      <span
        className={cn(
          'flex-1 whitespace-pre',
          line.type === 'add' && 'text-[var(--diff-add-text)]',
          line.type === 'delete' && 'text-[var(--diff-del-text)]',
          line.type === 'context' && 'text-[var(--text-secondary)]',
        )}
      >
        {line.content}
      </span>
    </div>
  )
}

/** 示例 diff 数据（演示用） */
const sampleDiff = `--- a/src/components/App.tsx
+++ b/src/components/App.tsx
@@ -1,10 +1,15 @@
 import React from 'react'
 import { Header } from './Header'
-import { Footer } from './Footer'
+import { StatusBar } from './StatusBar'
+import { ThemeToggle } from './common/ThemeToggle'

-function App() {
+export function App() {
   return (
-    <div className="app">
+    <div className="app" data-theme="dark">
       <Header />
-      <Footer />
+      <main className="flex-1">
+        <ChatPanel />
+      </main>
+      <StatusBar />
     </div>
   )
 }
-export default App
+`
