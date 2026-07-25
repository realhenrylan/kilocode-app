import { cn } from '@/utils/cn'
import type { KiloToolCall } from '@/types/kilo'
import {
  FileEdit,
  Terminal,
  Search,
  Globe,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

/**
 * 工具调用卡片
 *
 * 可视化展示 AI 的工具调用：文件读写、命令执行、搜索等
 * Codex风格：紧凑卡片，状态图标，可展开详情
 */
const toolIcons: Record<string, typeof FileEdit> = {
  read_file: FileEdit,
  write_to_file: FileEdit,
  apply_diff: FileEdit,
  execute_command: Terminal,
  search_files: Search,
  codebase_search: Search,
  browser_action: Globe,
  list_files: Search,
  list_code_definition_names: Search,
  ask_followup_question: Wrench,
  attempt_completion: CheckCircle,
}

const toolLabels: Record<string, string> = {
  read_file: '读取文件',
  write_to_file: '写入文件',
  apply_diff: '应用差异',
  execute_command: '执行命令',
  search_files: '搜索文件',
  codebase_search: '代码搜索',
  browser_action: '浏览器操作',
  list_files: '列出文件',
  list_code_definition_names: '查找定义',
  ask_followup_question: '追问',
  attempt_completion: '完成',
}

export function ToolCallCard({ toolCall }: { toolCall: KiloToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = toolIcons[toolCall.name] || Wrench
  const label = toolLabels[toolCall.name] || toolCall.name

  const statusIcon = {
    pending: <Loader2 size={10} className="animate-spin text-[var(--warning)]" />,
    running: <Loader2 size={10} className="animate-spin text-[var(--accent)]" />,
    completed: <CheckCircle size={10} className="text-[var(--success)]" />,
    failed: <XCircle size={10} className="text-[var(--error)]" />,
    cancelled: <XCircle size={10} className="text-[var(--text-tertiary)]" />,
  }[toolCall.status]

  // 提取关键信息用于摘要
  const summary = getToolSummary(toolCall)

  return (
    <div className="rounded-md border border-[var(--border-subtle] bg-[var(--bg-tertiary)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <Icon size={12} className="text-[var(--accent)]" />
        <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        {summary && <span className="text-[var(--text-tertiary)]">{summary}</span>}
        <div className="flex-1" />
        {statusIcon}
        {toolCall.duration && (
          <span className="text-[10px] text-[var(--text-tertiary)]">{toolCall.duration}ms</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-3 py-2">
          {/* 输入参数 */}
          <div className="mb-2">
            <p className="mb-1 text-[10px] font-medium text-[var(--text-tertiary)]">输入</p>
            <pre className="overflow-x-auto rounded bg-[var(--code-bg)] p-2 text-[10px] text-[var(--text-secondary)]">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>

          {/* 输出结果 */}
          {toolCall.output && (
            <div>
              <p className="mb-1 text-[10px] font-medium text-[var(--text-tertiary)]">输出</p>
              <pre className="overflow-x-auto rounded bg-[var(--code-bg)] p-2 text-[10px] text-[var(--text-secondary)]">
                {toolCall.output}
              </pre>
            </div>
          )}

          {/* 错误信息 */}
          {toolCall.error && (
            <div>
              <p className="mb-1 text-[10px] font-medium text-[var(--error)]">错误</p>
              <pre className="overflow-x-auto rounded bg-[var(--error-muted)] p-2 text-[10px] text-[var(--error)]">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 提取工具调用的摘要信息 */
function getToolSummary(toolCall: KiloToolCall): string {
  const input = toolCall.input
  switch (toolCall.name) {
    case 'read_file':
    case 'write_to_file':
      return String(input.path || input.file_path || '').split('/').pop() || ''
    case 'execute_command':
      return String(input.command || '').slice(0, 40)
    case 'search_files':
      return String(input.query || input.regex || '')
    case 'browser_action':
      return String(input.action || '')
    default:
      return ''
  }
}
