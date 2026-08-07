# 设置｜ Settings

Pi 使用 JSON 设置文件，项目设置覆盖全局设置。

| 位置 | 范围 |
|----------|-------|
| `~/.pi/agent/settings.json` | 全局(所有项目) |
| `.pi/settings.json` | 项目(当前目录) |

直接编辑或使用`/settings`获取常见选项。

## 项目信任｜ Project Trust

在交互式启动时，如果项目文件夹包含project-local设置、资源或项目`.agents/skills`，且该文件夹或其父文件夹在`~/.pi/agent/trust.json`中没有已保存的决策， pi 会询问是否信任该文件夹。信任项目允许 pi 加载`.pi/settings.json`和`.pi`资源、安装缺失的项目包并执行项目扩展。

非交互模式(`-p`、`--mode json`和`--mode rpc`)不显示信任提示。如果没有适用的已保存信任决策，它们使用全局设置中的`defaultProjectTrust`：`ask`(默认)和`never`忽略这些项目资源，而`always`信任它们。传递`--approve`/`-a`或`--no-approve`/`-na`可在单次运行中覆盖项目信任。

如果没有适用的扩展或已保存决策，`defaultProjectTrust`控制回退行为。在`~/.pi/agent/settings.json`中将其设置为`"ask"`、`"always"`或`"never"`，或使用`/settings`更改。

`pi config`和包命令使用相同的项目信任流程，但`pi update`从不提示。传递`--approve`以信任project-local设置用于单条命令，或传递`--no-approve`以忽略它们。

在交互模式中使用`/trust`保存项目信任决策以供未来会话使用，包括对直接父文件夹的信任。它仅写入`~/.pi/agent/trust.json`；当前会话不会重新加载，因此请重启 pi 以使更改生效。

## 所有设置｜ All Settings

### 模型与思考｜ Model & Thinking

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `defaultProvider` | 字符串 | - | 默认提供商(e.g。、`"anthropic"`、`"openai"`) |
| `defaultModel` | 字符串 | - | 默认模型 ID |
| `defaultThinkingLevel` | 字符串 | - | `"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` |
| `hideThinkingBlock` | 布尔值 | `false` | 在输出中隐藏思考块 |
| `showCacheMissNotices` | 布尔值 | `false` | 显示重要 prompt-cache 遗漏的会话记录通知 |
| `thinkingBudgets` | 对象 | - | 每个思考级别的自定义令牌预算 |

#### thinkingBudgets

```json
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

### 界面与显示｜ UI & Display

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `theme` | 字符串 | `"dark"` | 主题名称 (`"dark"`、`"light"` 或自定义) |
| `externalEditor` | 字符串 | `$VISUAL`，然后 `$EDITOR`，然后在 Windows 上使用记事本或 `nano` 在其他系统上 | Ctrl+G 外部编辑器的命令；优先于环境变量 |
| `quietStartup` | 布尔值 | `false` | 隐藏启动标题 |
| `defaultProjectTrust` | 字符串 | `"ask"` | 回退项目信任行为：`"ask"`、`"always"` 或 `"never"`。仅全局设置 |
| `collapseChangelog` | 布尔值 | `false` | 更新后显示精简变更日志 |
| `enableInstallTelemetry` | 布尔值 | `true` | 在首次安装或changelog-detected更新后发送匿名安装/更新版本 ping。这不控制更新检查。 |
| `enableAnalytics` | 布尔值 | `false` | 选择加入的分析数据共享。目前仅在实验性first-time设置期间询问(`PI_EXPERIMENTAL=1`)。 |
| `trackingId` | 字符串 | - | 分析跟踪标识符，在`enableAnalytics`开启时生成。 |
| `doubleEscapeAction` | 字符串 | `"tree"` | double-escape的操作：`"tree"`、`"fork"`或`"none"`。 |
| `treeFilterMode` | 字符串 | `"default"` | `/tree`的默认筛选器：`"default"`、`"no-tools"`、`"user-only"`、`"labeled-only"`、`"all"`。 |
| `editorPaddingX` | 数字 | `0` | 输入编辑器的水平内边距(0-3)。 |
| `outputPad` | 数字 | `1` | 用户消息、助手消息和思考消息的水平内边距 (0 或 1) |
| `autocompleteMaxVisible` | 数字 | `5` | 自动补全下拉菜单中最大可见项数 (3-20) |
| `showHardwareCursor` | 布尔值 | `false` | 当 TUI 为 IME 支持定位终端光标时，显示终端光标 |
| `tuiMode` | 字符串 | `"regular"` | 交互式 TUI 模式：`"regular"` 或实验性 `"fullscreen"`。来自 `/settings` 的更改立即生效；`--tui-mode` 在启动时覆盖此设置 |
| `fullscreenScrollbar` | 字符串 | `"auto"` | 全屏转录滚动条：`"auto"` 在滚动时临时显示，`"always"` 保留最右侧列并保持可见，`"hidden"` 隐藏它。在常规 TUI 模式下无效 |

对于 VS Code ，包含 `--wait` 以便 pi 在编辑器退出后恢复：

```json
{
  "externalEditor": "code --wait"
}
```

### 遥测和更新检查

`enableInstallTelemetry` 仅控制对 `https://pi.dev/api/report-install` 的匿名安装/更新 ping。选择退出遥测不会禁用更新检查；Pi 仍可获取 `https://pi.dev/api/latest-version` 以查找最新版本。

设置 `PI_SKIP_VERSION_CHECK=1` 以禁用 Pi 版本更新检查。使用 `--offline` 或 `PI_OFFLINE=1` 禁用此处描述的所有启动网络操作，包括更新检查、包更新检查和安装/更新遥测。

### 网络

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `httpProxy` | 字符串 | - | HTTP 代理 URL 以 `HTTP_PROXY` 和 `HTTPS_PROXY` 形式应用。仅全局设置。 |

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### 警告

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `warnings.anthropicExtraUsage` | 布尔值 | `true` | 当 Anthropic 订阅认证可能使用付费额外用量时显示警告 |

```json
{
  "warnings": {
    "anthropicExtraUsage": false
  }
}
```

### 上下文压缩

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `compaction.enabled` | 布尔值 | `true` | 启用 auto-compaction |
| `compaction.reserveTokens` | 数字 | `16384` | 为 LLM 响应预留的令牌数 |
| `compaction.keepRecentTokens` | 数字 | `20000` | 保留的最近令牌数 (不进行摘要) |

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

### 分支摘要｜ Branch Summary

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `branchSummary.reserveTokens` | 数字 | `16384` | 为分支摘要预留的令牌数 |
| `branchSummary.skipPrompt` | 布尔值 | `false` | 在 `/tree` 导航时跳过“是否对分支进行摘要？”提示 (默认为不进行摘要) |

### 重试｜ Retry

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `retry.enabled` | 布尔值 | `true` | 在瞬时错误时启用自动agent-level重试 |
| `retry.maxRetries` | 数字 | `3` | 最大agent-level重试次数 |
| `retry.baseDelayMs` | 数字 | `2000` | agent-level指数退避的基础延迟(2 秒、4 秒、8 秒) |
| `retry.provider.timeoutMs` | 数字 | SDK默认值 | 模型提供商/SDK请求超时时间（毫秒） |
| `retry.provider.maxRetries` | 数字 | `0` | 模型提供商/SDK重试次数 |
| `retry.provider.maxRetryDelayMs` | 数字 | `60000` | 失败前的最大 server-requested 延迟 (60s) |

当模型提供商请求的重试延迟超过 `retry.provider.maxRetryDelayMs` 时，请求会立即失败并返回信息性错误，而不是静默等待。将其设置为 `0` 可禁用此限制。

除非明确需要 provider-level 重试，否则请将 `retry.provider.maxRetries` 保持为 `0`。将其设置为高于 `0` 可能会使 SDK/模型提供商的重试在 Pi 看到 out-of-usage-limit 错误之前处理它们，这可能会在某些情况下阻塞代理，直到模型提供商的配额重置。

```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "provider": {
      "timeoutMs": 3600000,
      "maxRetries": 0,
      "maxRetryDelayMs": 60000
    }
  }
}
```

### 消息传递

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `steeringMode` | 字符串 | `"one-at-a-time"` | 引导消息的发送方式：`"all"` 或 `"one-at-a-time"` |
| `followUpMode` | 字符串 | `"one-at-a-time"` | follow-up 消息的发送方式：`"all"` 或 `"one-at-a-time"` |
| `transport` | 字符串 | `"auto"` | 支持多种传输方式的模型提供商的首选传输方式：`"sse"`、`"websocket"`、`"websocket-cached"` 或 `"auto"` |
| `httpIdleTimeoutMs` | 数字 | `300000` | HTTP 头部/主体空闲超时时间（毫秒），也用于具有显式流空闲超时的模型提供商。设置为 `0` 以禁用。 |
| `websocketConnectTimeoutMs` | 数字 | `15000` | WebSocket 连接/打开握手超时时间（毫秒），适用于支持 WebSocket 传输的模型提供商。设置为 `0` 以禁用。 |

### 终端与图像｜终端 & Images

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `terminal.showImages` | 布尔值 | `true` | 在终端中显示图像(（如果支持）) |
| `terminal.imageWidthCells` | 数字 | `60` | 终端单元格中首选的内联图像宽度 |
| `terminal.clearOnShrink` | 布尔值 | `false` | 内容缩小时清除空行(（可能导致闪烁）) |
| `images.autoResize` | 布尔值 | `true` | 将图片最大缩放至 2000x2000。适用于 `@file` 附件、`read` 以及工具返回的图片 |
| `images.blockImages` | 布尔值 | `false` | 阻止所有图片发送至 LLM |

### Shell

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `shellPath` | 字符串 | - | 自定义 shell 路径 (e.g。，适用于 Windows 上的 Cygwin)；支持以 `~` 开头表示主目录 |
| `shellCommandPrefix` | 字符串 | - | 每个 bash 命令的前缀 (e.g。，`"shopt -s expand_aliases"`) |
| `npmCommand` | 字符串[] | - | 用于 npm package 查找/安装操作的命令 argv (e.g。，`["mise", "exec", "node@20", "--", "npm"]`) |

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

`npmCommand` 用于所有 npm package-manager 操作，包括安装、卸载以及 git packages. 内部的依赖安装。用户级 npm packages 安装在 `~/.pi/agent/npm/` 下；project-scoped npm packages 安装在 `.pi/npm/` 下。使用 argv-style 条目，完全按照进程应启动的方式。当配置了 `npmCommand` 时， git package 依赖安装使用纯 `install`，以避免包装器或替代包管理器中的 npm-specific 标志。

### 会话｜ Sessions

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `sessionDir` | 字符串 | - | 会话文件的存储目录。支持绝对路径或相对路径，以及 `~`。 |

```json
{ "sessionDir": ".pi/sessions" }
```

当多个来源指定会话目录时，优先级依次为 `--session-dir`、`PI_CODING_AGENT_SESSION_DIR`，然后是 `sessionDir`（在 settings.json 中）。

### 模型循环｜ Model Cycling

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `enabledModels` | 字符串[] | - | 用于 Ctrl+P 循环切换的模型模式 (与 `--models` CLI 标志格式相同) |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `markdown.codeBlockIndent` | string | `"  "` | 代码块的缩进 |
| `markdown.mermaid` | string | `"streaming"` | Mermaid 渲染模式：`"off"`、`"final"` 或 `"streaming"` |

### 资源

这些设置定义了从哪里加载扩展、技能、提示词和主题。

`~/.pi/agent/settings.json` 中的路径相对于 `~/.pi/agent` 解析。`.pi/settings.json` 中的路径相对于 `.pi` 解析。支持绝对路径和 `~`。

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `packages` | array | `[]` | npm/git packages 用于加载资源的包 |
| `extensions` | string[] | `[]` | 本地扩展文件路径或目录 |
| `skills` | 字符串[] | `[]` | 本地技能文件路径或目录 |
| `prompts` | 字符串[] | `[]` | 本地提示词模板路径或目录 |
| `themes` | 字符串[] | `[]` | 本地主题文件路径或目录 |
| `enableSkillCommands` | 布尔值 | `true` | 将技能注册为 `/skill:name` 命令 |

数组支持 glob 模式和排除项。使用 `!pattern` 进行排除。使用 `+path` 来 force-include 一个精确路径，使用 `-path` 来 force-exclude 一个精确路径。

#### 包

字符串形式从包中加载所有资源：

```json
{
  "packages": ["pi-skills", "@org/my-extension"]
}
```

对象形式过滤要加载的资源：

```json
{
  "packages": [
    {
      "source": "pi-skills",
      "skills": ["brave-search", "transcribe"],
      "extensions": []
    }
  ]
}
```

有关包管理的详细信息，请参阅 [packages.md](packages.md)。

## 示例

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "warnings": {
    "anthropicExtraUsage": true
  },
  "packages": ["pi-skills"]
}
```

## 项目覆盖

项目设置 (`.pi/settings.json`) 覆盖全局设置。嵌套对象会合并：

```json
// ~/.pi/agent/settings.json (global)
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 16384 }
}

// .pi/settings.json (project)
{
  "compaction": { "reserveTokens": 8192 }
}

// Result
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 8192 }
}
```
