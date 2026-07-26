# Codex 风格重设计 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 KiloCode Desktop 视觉风格从 VS Code 式冷黑底迁移到 Codex 暖炭灰体系，4 步渐进实施

**Architecture:** CSS Token 替换 + 组件微调方案。每步只改 CSS 变量值和最小限度的组件 class，不破坏现有功能逻辑。后端零改动。

**Tech Stack:** React 19 + Tailwind CSS 4 + CSS Custom Properties + Zustand

---

## Task 1: 替换深色主题 CSS Token（暖炭灰底色体系）

**Files:**
- Modify: `src/styles/globals.css:16-80`

- [ ] **Step 1: 替换深色主题背景变量**

将 `:root[data-theme="dark"]` 中的背景变量替换为暖炭灰体系：

```css
/* 基础背景 */
--bg-primary: #1B1A18;        /* 暖炭灰，非纯黑 */
--bg-secondary: #232220;      /* 浮起表面/Composer */
--bg-tertiary: #2A2926;       /* 二级浮起/hover */
--bg-hover: rgba(255,255,255,0.05);  /* 悬停，改用透明白 */
--bg-active: rgba(255,255,255,0.08); /* 激活态 */
```

- [ ] **Step 2: 替换深色主题文本变量**

```css
/* 文本 */
--text-primary: #ECEBE8;      /* 暖白，非纯白 */
--text-secondary: #9C9A93;    /* 次级信息 */
--text-tertiary: #6C6A63;     /* 占位/提示 */
--text-inverse: #1B1A18;      /* 反色文本 */
```

- [ ] **Step 3: 收敛品牌黄，移除 Cyan accent**

```css
/* KiloCode品牌色 - 黄色系（收敛：仅Logo/发送/shimmer）*/
--brand-primary: #FFD700;
--brand-hover: #FFE44D;
--brand-muted: rgba(255, 215, 0, 0.15);
--brand-subtle: rgba(255, 215, 0, 0.08);

/* 功能色（移除Cyan，链接改用下划线）*/
--accent: #9C9A93;            /* 中性灰替代Cyan */
--accent-hover: #ECEBE8;
--accent-muted: rgba(255,255,255,0.06);
--success: #7DBB6E;           /* 低饱和绿 */
--success-muted: rgba(125, 187, 110, 0.15);
--error: #E5716A;             /* 低饱和红 */
--error-muted: rgba(229, 113, 106, 0.15);
--warning: #E8C400;           /* 品牌黄暗化 */
--warning-muted: rgba(232, 196, 0, 0.15);
```

- [ ] **Step 4: 替换边框/分隔/特殊变量**

```css
/* 边框与分割（两档：hairline + strong）*/
--border: rgba(255,255,255,0.12);       /* strong，仅Composer用 */
--border-subtle: rgba(255,255,255,0.07); /* hairline，工具卡/分隔 */
--divider: rgba(255,255,255,0.10);       /* 区域分隔发丝线 */

/* 特殊 */
--user-msg-bg: #2A2926;                  /* 中性灰，去黄 */
--assistant-msg-bg: transparent;
--code-bg: #141311;                      /* 内嵌代码/终端 */
--code-border: rgba(255,255,255,0.07);
--scrollbar-thumb: #444444;
--scrollbar-track: transparent;
--shadow: 0 8px 32px rgba(0,0,0,0.35);
--overlay: rgba(0,0,0,0.6);

/* 输入框 */
--input-bg: #232220;
--input-border: rgba(255,255,255,0.07);
--input-focus-border: rgba(255,255,255,0.22);

/* 侧边栏（去黄，改中性灰）*/
--sidebar-bg: #161512;
--sidebar-item-hover: rgba(255,255,255,0.03);
--sidebar-item-active: rgba(255,255,255,0.07);
--sidebar-item-active-text: var(--text-primary);
```

- [ ] **Step 5: 更新 Diff 颜色**

```css
/* Diff */
--diff-add-bg: rgba(125,187,110,0.10);
--diff-del-bg: rgba(229,113,106,0.10);
--diff-add-text: #A9D8A0;
--diff-del-text: #E9A19C;
--diff-add-gutter: rgba(125,187,110,0.20);
--diff-del-gutter: rgba(229,113,106,0.20);
```

- [ ] **Step 6: 更新文件顶部注释**

```css
/* ============================================================
 * KiloCode Desktop - 全局样式与双主题色彩系统
 *
 * 设计原则（Codex V2.3）：
 * - 暖炭灰底色体系，靠明度差分区而非描边
 * - 品牌黄(#FFD700)仅3处签名：Logo、发送按钮、shimmer
 * - 发丝线两档：--border-subtle(0.07) / --border(0.12)
 * - 区域分隔用 --divider(0.10)
 * - CSS变量驱动，data-theme属性切换
 * ============================================================ */
```

- [ ] **Step 7: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: replace dark theme tokens with Codex warm charcoal system"
```

---

## Task 2: 替换浅色主题 CSS Token（暖纸白体系）

**Files:**
- Modify: `src/styles/globals.css:82-147`

- [ ] **Step 1: 替换浅色主题背景变量**

```css
:root[data-theme="light"] {
  /* 基础背景 */
  --bg-primary: #FAF9F6;        /* 暖纸白 */
  --bg-secondary: #FFFFFF;      /* 浮起表面 */
  --bg-tertiary: #EDEBE4;       /* 二级浮起 */
  --bg-hover: #EDEBE4;          /* 悬停 */
  --bg-active: #E0DDD5;         /* 激活态 */
```

- [ ] **Step 2: 替换浅色主题文本变量**

```css
  /* 文本 */
  --text-primary: #23211C;      /* 深暖黑 */
  --text-secondary: #6E6B62;    /* 次级 */
  --text-tertiary: #A09D93;     /* 占位 */
  --text-inverse: #FAF9F6;      /* 反色 */
```

- [ ] **Step 3: 替换浅色品牌色和功能色**

```css
  /* KiloCode品牌色（浅色下深金保证对比度）*/
  --brand-primary: #B8860B;
  --brand-hover: #9A7009;
  --brand-muted: rgba(184, 134, 11, 0.12);
  --brand-subtle: rgba(184, 134, 11, 0.06);

  /* 功能色（移除Cyan）*/
  --accent: #6E6B62;
  --accent-hover: #23211C;
  --accent-muted: rgba(30, 25, 10, 0.06);
  --success: #2E7D32;
  --success-muted: rgba(46, 125, 50, 0.12);
  --error: #C62828;
  --error-muted: rgba(198, 40, 40, 0.12);
  --warning: #B8860B;
  --warning-muted: rgba(184, 134, 11, 0.12);
```

- [ ] **Step 4: 替换浅色边框/分隔/特殊变量**

```css
  /* 边框与分割 */
  --border: rgba(30, 25, 10, 0.12);
  --border-subtle: rgba(30, 25, 10, 0.08);
  --divider: rgba(30, 25, 10, 0.10);

  /* 特殊 */
  --user-msg-bg: #EDEBE4;       /* 中性灰，去黄 */
  --assistant-msg-bg: transparent;
  --code-bg: #F4F2EC;
  --code-border: rgba(30, 25, 10, 0.08);
  --scrollbar-thumb: #C0BDB5;
  --scrollbar-track: transparent;
  --shadow: 0 8px 28px rgba(60, 50, 20, 0.10);
  --overlay: rgba(0, 0, 0, 0.3);

  /* 输入框 */
  --input-bg: #FFFFFF;
  --input-border: rgba(30, 25, 10, 0.08);
  --input-focus-border: rgba(30, 25, 10, 0.22);

  /* 侧边栏 */
  --sidebar-bg: #F1EFE9;
  --sidebar-item-hover: rgba(30, 25, 10, 0.03);
  --sidebar-item-active: rgba(30, 25, 10, 0.07);
  --sidebar-item-active-text: var(--text-primary);
```

- [ ] **Step 5: 替换浅色 Diff 颜色**

```css
  /* Diff */
  --diff-add-bg: #E8F5E9;
  --diff-del-bg: #FFEBEE;
  --diff-add-text: #1B5E20;
  --diff-del-text: #B71C1C;
  --diff-add-gutter: #C8E6C9;
  --diff-del-gutter: #FFCDD2;
```

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: replace light theme tokens with Codex warm paper-white system"
```

---

## Task 3: 更新链接样式（移除 Cyan，改用下划线）

**Files:**
- Modify: `src/styles/globals.css:204-212`

- [ ] **Step 1: 替换链接样式**

将链接从 Cyan 色改为中性色 + 下划线：

```css
/* ===== 链接 ===== */
a {
  color: var(--text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

a:hover {
  color: var(--text-primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: remove cyan from links, use neutral color + underline"
```

---

## Task 4: 在 AppShell 添加发丝线分隔

**Files:**
- Modify: `src/components/layout/AppShell.tsx:31,45`

- [ ] **Step 1: 侧边栏边界改用 --divider 发丝线**

将侧边栏的 `border-[var(--border-subtle)]` 改为 `border-[var(--divider)]`：

```tsx
<div
  className={cn(
    'flex-shrink-0 border-r border-[var(--divider)] bg-[var(--sidebar-bg)] transition-all duration-200',
    sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-60'
  )}
>
```

- [ ] **Step 2: 右面板边界改用 --divider 发丝线**

```tsx
{rightPanelVisible && (
  <div className="flex w-96 flex-shrink-0 border-l border-[var(--divider)] bg-[var(--bg-secondary)]">
    <RightPanel />
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "style: use --divider hairline for sidebar and right panel borders"
```

---

## Task 5: 更新 TitleBar 发丝线

**Files:**
- Modify: `src/components/layout/TitleBar.tsx:31`

- [ ] **Step 1: 标题栏底部改用 --divider**

```tsx
<div className="titlebar-drag flex h-9 items-center justify-between border-b border-[var(--divider)] bg-[var(--bg-primary)] select-none">
```

注意：背景从 `--bg-secondary` 改为 `--bg-primary`，标题栏融入主背景。

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/TitleBar.tsx
git commit -m "style: titlebar uses --divider hairline and blends into primary bg"
```

---

## Task 6: 更新 Sidebar 发丝线和去黄

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:28,40,57`

- [ ] **Step 1: Logo 区域底部改用 --divider**

```tsx
<div className="flex items-center gap-2 border-b border-[var(--divider)] px-4 py-3">
```

- [ ] **Step 2: 新建会话按钮去虚线，改实底化**

```tsx
<button onClick={createNewSession} className="flex w-full items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]">
```

- [ ] **Step 3: 底部区域顶部改用 --divider**

```tsx
<div className="border-t border-[var(--divider)]">
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "style: sidebar uses --divider hairline, new-session button solid style"
```

---

## Task 7: 更新 MainPanel 发丝线

**Files:**
- Modify: `src/components/layout/MainPanel.tsx:26`

- [ ] **Step 1: Composer 区域顶部改用 --divider**

```tsx
<div className="border-t border-[var(--divider)] bg-[var(--bg-primary)]">
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MainPanel.tsx
git commit -m "style: main panel uses --divider hairline above composer"
```

---

## Task 8: 更新 UserMessage 去黄

**Files:**
- Modify: `src/components/chat/UserMessage.tsx:37`

- [ ] **Step 1: 用户消息气泡圆角调整**

将 `rounded-2xl rounded-br-sm` 改为 Codex 风格的 `rounded-2xl rounded-br-sm`（保持现有圆角，背景色已通过 CSS 变量 `--user-msg-bg` 自动更新为中性灰 #2A2926）

无需改动——`--user-msg-bg` 已在 Task 1 中更新为 `#2A2926`，组件引用 `bg-[var(--user-msg-bg)]` 会自动生效。

- [ ] **Step 2: Commit（如有改动）**

此 Task 无需代码改动，CSS 变量替换已覆盖。跳过 commit。

---

## Task 9: 更新 StreamingIndicator 发丝线

**Files:**
- Modify: `src/components/chat/StreamingIndicator.tsx:9`

- [ ] **Step 1: 顶部边框改用 --divider**

```tsx
<div className="flex items-center gap-2 border-t border-[var(--divider)] bg-[var(--bg-primary)] px-4 py-1.5">
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/StreamingIndicator.tsx
git commit -m "style: streaming indicator uses --divider hairline"
```

---

## Task 10: 构建验证

**Files:** 无代码改动

- [ ] **Step 1: 运行构建**

```bash
cd D:/realhenrylan/kilocode-app && npm run build
```

Expected: exit 0，无错误

- [ ] **Step 2: 检查品牌黄仅出现在 3 处签名位置**

在构建产物中搜索 `#FFD700` 和 `--brand-primary` 的使用，确认：
- Logo 区域 ✅
- 发送按钮 ✅
- Shimmer 动画 ✅
- 其他位置不应直接使用品牌黄作为背景/边框/激活色

- [ ] **Step 3: 更新 CHANGELOG**

在 `CHANGELOG.md` 顶部添加：

```markdown
## [Unreleased]

### Style
- 替换深色主题为 Codex 暖炭灰底色体系 (#1B1A18)
- 替换浅色主题为暖纸白体系 (#FAF9F6)
- 移除 Cyan accent，链接改用中性色 + 下划线
- 品牌黄收敛为 3 处签名：Logo、发送按钮、shimmer
- 新增 --divider 发丝线变量，区域分隔更清晰
- 侧边栏激活态去黄，改为中性灰
- 用户消息背景去黄，改为中性灰
- 新建会话按钮去虚线，改为实底 + hairline
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for Codex theme step 1"
```
