# Codex 风格重设计 — 设计文档

> 日期: 2026-07-25
> 状态: 已批准
> 设计稿: `docs/design/codex-redesign.html` (V2.3)

## 1. 目标

将 KiloCode Desktop 的视觉风格从当前 VS Code 式冷黑底 + 黄/Cyan 双强调色，迁移到 Codex 桌面端风格：暖炭灰底色、结构线分区、Composer 是唯一主角。品牌黄从"到处都是"收敛为三处签名式出场。

## 2. 前后端对齐评估

**结论：完全对齐，无需后端改动。** 所有变更均为前端 CSS/组件层面：

- 模式/模型胶囊迁入 Composer → `sessionStore.currentMode/currentModel` + API 已支持
- 右面板改按需抽屉 → `uiStore.rightPanelVisible/rightPanelTab` 已有
- Token 用量 → `tokenUsageStore` 已追踪
- 会话分叉信息 → API `/session/:id/fork` 已支持
- 搜索会话 → `/session` API 返回列表，前端过滤
- 深色/浅色主题 → `uiStore.theme` + `globals.css` 已有

## 3. 实施方案

**选择方案 A：CSS Token 替换 + 组件微调**（渐进式，风险最低）

4 步渐进，每步独立验证后再进入下一步。

### 第 1 步：换底色 + 分隔线（半天）

**改动范围**：`globals.css` + 少量组件 class 调整

**具体变更**：

1. 替换深色主题 CSS 变量：
   - `--bg-primary: #1B1A18`（暖炭灰，非纯黑）
   - `--sidebar-bg: #161512`（侧边栏，暗一档）
   - `--bg-secondary: #232220`（浮起表面/Composer）
   - `--bg-hover: rgba(255,255,255,0.05)`（悬停，改用透明白）
   - `--code-bg: #141311`（代码块/终端内嵌）
   - `--border: rgba(255,255,255,0.12)`（仅 Composer 用 strong）
   - `--border-subtle: rgba(255,255,255,0.07)`（hairline）
   - `--text-primary: #ECEBE8`（暖白）
   - `--text-secondary: #9C9A93`
   - `--text-tertiary: #6C6A63`
   - `--brand-primary: #FFD700`（仅 Logo/发送/shimmer）
   - `--user-msg-bg: #2A2926`（中性灰，去黄）
   - `--sidebar-item-active: rgba(255,255,255,0.07)`（中性，去黄）

2. 新增 `--divider: rgba(255,255,255,0.10)` 变量用于区域分隔发丝线

3. 替换浅色主题对应变量：
   - `--bg-primary: #FAF9F6`、`--sidebar-bg: #F1EFE9`、`--bg-secondary: #FFFFFF`
   - `--bg-hover: #EDEBE4`、`--code-bg: #F4F2EC`
   - `--text-primary: #23211C`、`--text-secondary: #6E6B62`、`--text-tertiary: #A09D93`
   - `--brand-primary: #B8860B`（深金，文本级强调）

4. 移除 Cyan accent，链接改用下划线

5. 在 AppShell 的标题栏、工具栏、侧边栏边界处添加 `--divider` 发丝线

**不改**：组件结构、状态管理、后端交互

### 第 2 步：Composer 改版（1 天）

**改动范围**：`Composer.tsx` + `Sidebar.tsx`

1. Composer 外层改为浮起大圆角卡：radius 18px、`--bg-secondary` 底色、`--border-strong` 描边、常驻投影
2. 输入区与控件区之间添加 `--border-hairline` 发丝线分隔
3. 模式/模型选择器从 Sidebar 迁入 Composer 底部，改为胶囊样式：radius 999px、1px 描边、12px 字号
4. 发送按钮：空闲态灰色圆形 → 有内容时品牌黄圆形 + 柔光
5. 从 Sidebar 移除 ModeSelector 和 ModelSelector 组件
6. Composer 提示行显示费用/token 信息

### 第 3 步：侧边栏瘦身（1 天）

**改动范围**：`Sidebar.tsx` + `SessionList.tsx` + `globals.css`

1. 会话列表按日期分组（今天/昨天/过去7天），用 `session.createdAt` 前端分组
2. 新建任务按钮去虚线，改为实底 + hairline 边框
3. 激活态去黄，改为 `rgba(255,255,255,0.07)` 中性灰
4. 顶部加搜索框（前端过滤）
5. ProjectPicker 与状态信息收到底部区域
6. 侧边栏宽度从 240px 调整为 256px
7. Logo 换为 KiloCode 官方 logo（亮黄圆角方块 + 像素风 K）

### 第 4 步：右面板改抽屉（1 天）

**改动范围**：`RightPanel.tsx` + `StatusBar.tsx` + `AppShell.tsx`

1. RightPanel 改为按需唤出的工作抽屉（440px），条件渲染 + 滑入动画
2. Tab 行换为分段控件（segmented control）
3. 抽屉左侧添加 `--divider` 发丝线
4. 删除 StatusBar 组件，费用/token 信息移至 Composer 提示行
5. 抽屉打开时对话列自动收窄
6. 无改动时抽屉自动收起

## 4. 品牌黄使用铁律

- **只出现在 3 处**：Logo 方块、发送按钮（激活态）、流式输出 shimmer 扫光
- **永不用作**：hover 背景、激活项背景、边框、用户消息底色
- 侧边栏激活态 = 中性灰 `rgba(255,255,255,0.07)`
- 浅色主题下文本级强调用 `#B8860B` 深金
- 成功/错误用低饱和 `#7DBB6E / #E5716A`

## 5. 圆角/间距/字号规格

| 元素 | 规格 |
|------|------|
| 标题栏/工具栏/抽屉头 | 38/46/46px，底部发丝线 |
| Composer | radius 18px，内边距 14px，常驻投影 |
| 用户消息 | radius 16px（右下 6px），padding 10/16 |
| 工具卡/代码块 | radius 10px，hairline 边 |
| 胶囊控件 | radius 999px，padding 5/12，12px 字，1px 边 |
| 侧边栏条目 | radius 8px，padding 7/10 |
| 正文/次级/说明 | 13.5px / 12.5px / 11px |
| 对话列宽 | max-width 720px 居中 |
| 侧边栏/抽屉 | 256px / 440px（按需） |

## 6. 验证标准

每步完成后需验证：
- [ ] 深色/浅色主题切换正常
- [ ] 所有交互功能不受影响（发送消息、切换模式/模型、会话管理）
- [ ] 品牌黄仅出现在 3 处签名位置
- [ ] 发丝线分区清晰可见
- [ ] 构建成功（`npm run build` exit 0）
