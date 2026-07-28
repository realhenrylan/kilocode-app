# 内置浏览器修复计划

> 日期: 2026-07-27
> 状态: 待审批
> 影响范围: ZCode Playwright MCP 浏览器功能

---

## 一、诊断结果

### 1.1 组件状态总览

| 组件 | 状态 | 详情 |
|------|------|------|
| Playwright MCP (内置) | ⚠️ 本次会话可用 | 但存在多个隐患，跨会话不稳定 |
| browser-skill (bsk) | ✅ 正常 | `bsk doctor` 全项通过 |
| @playwright/mcp 版本 | ❌ 混乱 | npx 缓存中存在 0.0.38 和 0.0.78 两个版本 |
| playwright-core | ❌ 使用 alpha 版 | `1.62.0-alpha-1783623505000`（非稳定版） |
| Chromium 浏览器二进制 | ❌ 版本缺失 | 需要 `chromium-1234`，但只安装到 `chromium-1223` |
| 浏览器 Profile | ⚠️ 大量残留 | 6个 `mcp-chrome-*` + 2个 `mcp-msedge-*` 目录 |
| 插件冲突 | ❌ 双重配置 | 官方 `browser-use` 插件 + 自定义 `playwright` 插件同时存在 |

### 1.2 已识别的 6 个问题

1. **Playwright Core 使用 Alpha 预发布版本** — 不稳定，行为不可预测
2. **Chromium 浏览器二进制版本缺失** — 依赖系统 Chrome，版本不兼容风险
3. **插件冲突** — 两个 Playwright MCP 源争抢资源
4. **大量残留浏览器 Profile** — 锁文件冲突、磁盘浪费
5. **npx 缓存版本混乱** — 每次启动可能命中不同版本
6. **Playwright Daemon 残留 Session** — 干扰新 session 创建

---

## 二、修复方案

### 步骤 1: 禁用自定义 playwright 插件（消除冲突源）

**问题**: 同时存在两个提供 Playwright MCP 的插件：
- 官方插件: `browser-use@0.1.0`（`zcode-plugins-official`）→ 提供 `mcp__plugin_playwright_playwright__*` 工具
- 自定义插件: `playwright@0.0.0`（`my-exported-plugins`）→ 使用 `npx @playwright/mcp@latest`

两者争抢浏览器实例、产生端口冲突、配置不一致。

**操作**: 修改 `~/.zcode/cli/config.json`

```json
// plugins.enabledPlugins 中修改:
"playwright@my-exported-plugins": false
```

**验证**: 重启 ZCode 后，日志中只应出现一个 `plugin:playwright:playwright` MCP 连接。

---

### 步骤 2: 清理 npx 缓存（消除版本混乱）

**问题**: `%LOCALAPPDATA%\npm-cache\_npx\` 下缓存了 3 个不同版本的 `@playwright/mcp`：
- `2bf7f25197c22677` → 0.0.38（旧版）
- `86170c4cd1c5da32` → 0.0.78（稳定版）
- `9833c18b2d85bc59` → 0.0.78 + alpha playwright-core（问题版本）

**操作**:

```bash
# 清理所有 @playwright/mcp 的 npx 缓存
rm -rf "$LOCALAPPDATA/npm-cache/_npx/2bf7f25197c22677"
rm -rf "$LOCALAPPDATA/npm-cache/_npx/86170c4cd1c5da32"
rm -rf "$LOCALAPPDATA/npm-cache/_npx/9833c18b2d85bc59"
```

**验证**: 下次 npx 调用会重新下载干净版本。

---

### 步骤 3: 清理残留浏览器 Profile（消除锁文件冲突）

**问题**: 浏览器 Profile 目录大量残留：
- `%LOCALAPPDATA%\ms-playwright-mcp\` 下 6 个 `mcp-chrome-*` 目录
- `%LOCALAPPDATA%\ms-playwright\` 下 6 个 `mcp-chrome-*` + 2 个 `mcp-msedge-*` 目录

当前活跃 Profile: `mcp-chrome-2894607`

**操作**:

```bash
# 清理 ms-playwright-mcp 中的残留（保留活跃的 2894607）
cd "$LOCALAPPDATA/ms-playwright-mcp"
ls -d mcp-chrome-*/ | grep -v "mcp-chrome-2894607" | xargs rm -rf

# 清理 ms-playwright 中的所有 mcp-chrome 和 mcp-msedge 残留
cd "$LOCALAPPDATA/ms-playwright"
rm -rf mcp-chrome-*/ mcp-msedge-*/
```

**验证**: `ls "$LOCALAPPDATA/ms-playwright-mcp/"` 应只剩 `mcp-chrome-2894607`。

---

### 步骤 4: 清理 Daemon 残留 Session

**问题**: `%LOCALAPPDATA%\ms-playwright\daemon\` 下有旧 session 文件，可能干扰新 session。

**操作**:

```bash
rm -rf "$LOCALAPPDATA/ms-playwright/daemon/dd6c578e746b8c84"
```

**验证**: `ls "$LOCALAPPDATA/ms-playwright/daemon/"` 应为空或只有新生成的目录。

---

### 步骤 5: 安装匹配的 Chromium 二进制

**问题**: Playwright 1.62 需要 `chromium-1234`，但本地只安装到 `chromium-1223`。当前能工作是因为配置了 `channel: "chrome"` 使用系统 Chrome，但系统 Chrome 更新后可能不兼容。

**操作**:

```bash
# 安装 Playwright 匹配的 Chromium
npx playwright install chromium
```

如果报错，先清理旧版本：

```bash
npx playwright install --force chromium
```

**验证**: `ls "$LOCALAPPDATA/ms-playwright/"` 应出现 `chromium-1234` 目录。

---

### 步骤 6: 重启 ZCode 会话并验证

**操作**: 完全退出 ZCode，重新启动新会话。

**验证清单**:

| # | 验证项 | 预期结果 | 验证方法 |
|---|--------|----------|----------|
| 1 | MCP 连接 | 日志中 `plugin:playwright:playwright` 连接成功 | 检查 `~/.zcode/cli/log/zcode-*.jsonl` |
| 2 | 导航测试 | 成功打开网页 | `browser_navigate` → `https://www.google.com` |
| 3 | 快照测试 | 返回页面 ARIA 结构 | `browser_snapshot` |
| 4 | 交互测试 | 能点击和输入 | `browser_click` + `browser_type` |
| 5 | 截图测试 | 生成截图文件 | `browser_take_screenshot` |
| 6 | 无冲突 | 只有一个 Playwright MCP 源 | 日志中无重复 MCP 连接 |

---

## 三、风险与回退

### 3.1 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 禁用自定义插件后官方插件不工作 | 低 | 高 | 重新启用自定义插件作为回退 |
| 清理 Profile 后丢失登录状态 | 确定 | 低 | MCP 浏览器本就不依赖用户登录 |
| Chromium 安装失败（网络问题） | 中 | 中 | 继续使用系统 Chrome（`channel: "chrome"`） |
| npx 重新下载慢 | 中 | 低 | 提前执行，不影响功能 |

### 3.2 回退方案

如果修复后浏览器完全不可用：

1. 重新启用自定义 playwright 插件:
   ```json
   "playwright@my-exported-plugins": true
   ```

2. 将自定义插件版本锁定到稳定版:
   ```json
   {
     "playwright": {
       "command": "npx",
       "args": ["@playwright/mcp@0.0.78"]
     }
   }
   ```

3. 重启 ZCode 会话验证。

---

## 四、长期建议

1. **版本锁定**: 避免使用 `@latest`，始终锁定 `@playwright/mcp` 到经过验证的稳定版本
2. **定期清理**: 每月清理一次残留的浏览器 Profile 和 npx 缓存
3. **单一 MCP 源**: 只保留官方内置的 browser-use 插件，不要同时启用自定义 playwright 插件
4. **Chromium 版本同步**: Playwright 大版本升级后，及时运行 `npx playwright install chromium` 更新浏览器二进制
