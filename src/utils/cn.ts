/**
 * className 合并工具
 *
 * 基于 clsx，支持条件类名合并
 */
import { clsx } from 'clsx'

export function cn(...inputs: Parameters<typeof clsx>) {
  return clsx(inputs)
}
