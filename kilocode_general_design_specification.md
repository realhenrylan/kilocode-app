# KiloCode 桌面端通用设计规范 (General Design Specifications)

本规范旨在为 KiloCode 桌面客户端提供统一的视觉语言与交互基础，强调简约、高效及开发者友好的界面体验。

## 1. 字体系统 (Typography)

为了确保在不同操作系统（macOS, Windows, Linux）上的一致性，采用系统级字体优先策略，并针对代码与界面文字进行区分。

### 1.1 界面字体 (Interface Font)
- **字体族**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `"Microsoft YaHei"`, `sans-serif`
- **基础字号**: `14px` (用于常规文本与标签)
- **字阶系统**:
  - `Display`: 32px / 40px (特大标题)
  - `Headline`: 24px / 20px (模块标题)
  - `Title`: 16px (小标题/加粗)
  - `Label`: 13px / 12px (辅助信息/次要标签)

### 1.2 代码字体 (Code Font)
- **字体族**: `"JetBrains Mono"`, `"Fira Code"`, `Menlo`, `Monaco`, `"Courier New"`, `monospace`
- **特性**: 必须开启 `font-variant-ligatures: normal` (支持编程连字)。

---

## 2. 间距与网格 (Spacing & Grid)

采用 4px/8px 为基础单位的步进系统，确保布局的节奏感。

### 2.1 基础单位
- `xs`: 4px
- `sm`: 8px
- `md`: 16px (标准间距)
- `lg`: 24px (模块间距)
- `xl`: 32px (页面大边距)
- `xxl`: 48px+

### 2.2 页面布局规范
- **侧边栏宽度**: 固定 `240px`。
- **主内容区**:
  - 最小内边距: `32px` (XL)。
  - 最大内容宽度: `1024px` (确保宽屏下阅读不费力)。
- **留白策略**: 鼓励大面积留白以缓解开发者工具常见的视觉压力。

---

## 3. 颜色与主题 (Color & Theming)

### 3.1 核心色调
- **品牌金 (Brand Gold)**: `#FFD700` (用于激活态、主按钮、重要开关)。
- **语义色**:
  - `Success`: #4CAF50
  - `Warning`: #FF9800
  - `Error`: #F44336
  - `Info`: #2196F3

### 3.2 主题适配
- **深色模式 (Dark)**: 背景采用 `#0A0A0A` 或 `#121212`，表面色采用 `#1E1E1E`。
- **浅色模式 (Light)**: 背景采用纯白 `#FFFFFF` 或极浅灰 `#F8F9FA`，边框采用 `#E0E0E0`。

---

## 4. 圆角规范 (Corners)

统一采用柔和的几何圆角以提升现代感。
- **基础圆角**: `8px` (容器、卡片、大型按钮)。
- **小圆角**: `4px` (输入框、标签、小按钮)。
- **全圆角**: `999px` (搜索框、状态药丸标签)。

---

## 5. 交互逻辑 (Interactions)

- **悬停状态**: 所有可交互元素必须具备背景色深浅变化或缩放反馈（102ms transition）。
- **聚焦状态**: 输入框聚焦时应有品牌金 (#FFD700) 的外边框描边（2px solid）。
- **加载态**: 采用骨架屏（Skeleton Screen）而非单一的旋转进度条，以减少跳跃感。

---

## 6. 中英文混排规范

- **中西文间距**: 在中文与英文/数字之间自动保留微小空隙（通过代码逻辑或字体本身实现）。
- **标点符号**: 界面标签统一使用中文全角标点，但在代码示例区域严格使用西文半角标点。
