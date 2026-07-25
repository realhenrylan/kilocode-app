import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'
import type { ThemeMode } from '@/types/kilo'

/**
 * 主题管理 Hook
 *
 * 职责：
 * 1. 根据 theme 设置（dark/light/system）解析实际主题
 * 2. 监听系统主题变化（system 模式）
 * 3. 更新 document.data-theme 属性
 * 4. 切换时添加过渡动画 class
 */
export function useTheme() {
  const { theme, resolvedTheme, setTheme, setResolvedTheme } = useUiStore()

  /** 解析主题：system 模式下读取系统偏好 */
  function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode
  }

  /** 应用主题到 DOM */
  function applyTheme(resolved: 'dark' | 'light') {
    // 添加过渡动画
    document.documentElement.classList.add('theme-transition')
    document.documentElement.setAttribute('data-theme', resolved)

    // 过渡完成后移除 class
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 200)

    return () => clearTimeout(timer)
  }

  // 初始化 + 主题变化时应用
  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    const cleanup = applyTheme(resolved)
    return cleanup
  }, [theme, setResolvedTheme])

  // System 模式下监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme, setResolvedTheme])

  return {
    theme,
    resolvedTheme,
    setTheme,
    /** 是否为深色模式 */
    isDark: resolvedTheme === 'dark',
  }
}
