# 设置｜ Settings

Pi使用JSON设置文件，其中项目设置会覆盖全局设置。

| 位置 | 作用域 |
|----------|-------|
| `~/.pi/agent/settings.json` | 全局 (所有项目) |
| `.pi/settings.json` | 项目 (当前目录) |

直接编辑或使用 `/settings` 查看常见选项。

## 项目信任

在交互式启动时，如果项目文件夹包含 project-local 设置、资源或项目 `.agents/skills`，并且该文件夹或其父文件夹在 `~/.pi/agent/trust.json` 中没有已保存的决策， pi 会在信任前进行询问。信任项目允许 pi 加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目包以及执行项目扩展。

非交互式模式 (`-p`、`--mode json` 和 `--mode rpc`) 不会显示信任提示。如果没有适用的已保存信任决策，它们将使用全局设置中的 `defaultProjectTrust`：`ask` (默认) 和 `never` 会忽略这些项目资源，而 `always` 则信任它们。传递 `--approve`/`-a` 或 `--no-approve`/`-na` 可在一次运行中覆盖项目信任。

如果没有适用的扩展或已保存的决策，`defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中将其设置为 `"ask"`、`"always"` 或 `"never"`，或使用 `/settings` 更改。

`pi config` 和包命令使用相同的项目信任流程，但 `pi update` 从不提示。传递 `--approve` 可信任 project-local 设置以执行单个命令，或传递 `--no-approve` 忽略它们。

在交互式模式下使用 `/trust` 可保存项目信任决策以供将来会话使用，包括对直接父文件夹的信任。它仅写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此请重启 pi 以使更改生效。

## 所有设置

### 模型与思考

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `defaultProvider` | 字符串 | - | 默认模型提供商 (e.g、`"anthropic"`、`"openai"`) |
| `defaultModel` | 字符串 | - | 默认模型 ID |
| `defaultThinkingLevel` | 字符串 | - | `"off"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`, `"max"` |
| `hideThinkingBlock` | 布尔值 | `false` | 在输出中隐藏思考块 |
| `showCacheMissNotices` | 布尔值 | `false` | 显示重要的 prompt-cache 遗漏的转录通知 |
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

### UI 与显示

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `theme` | 字符串 | `"dark"` | 主题名称 (`"dark"`、`"light"` 或自定义) |
| `externalEditor` | 字符串 | `$VISUAL`，然后 `$EDITOR`，接着在 Windows 上使用记事本或其他系统中使用 `nano` | Ctrl+G 外部编辑器的命令；优先级高于环境变量 |
| `quietStartup` | 布尔值 | `false` | 隐藏启动标题 |
| `defaultProjectTrust` | 字符串 | `"ask"` | 回退项目信任行为：`"ask"`、`"always"` 或 `"never"`。仅全局设置 |
| `collapseChangelog` | 布尔值 | `false` | 更新后显示精简更新日志 |
| `enableInstallTelemetry` | 布尔值 | `true` | 首次安装或每 changelog-detected 次更新后发送匿名安装/更新版本 ping。这不控制更新检查 |
| `enableAnalytics` | 布尔值 | `false` | 选择性加入分析数据共享。目前仅在实验性 first-time 设置 (`PI_EXPERIMENTAL=1`) 期间询问 |
| `trackingId` | 字符串 | - | 分析跟踪标识符，在 `enableAnalytics` 开启时生成 |
| `doubleEscapeAction` | 字符串 | `"tree"` | double-escape 的操作：`"tree"`、`"fork"` 或 `"none"` |
| `treeFilterMode` | 字符串 | `"default"` | `/tree` 的默认筛选条件：`"default"`、`"no-tools"`、`"user-only"`、`"labeled-only"`、`"all"` |
| `editorPaddingX` | 数字 | `0` | 输入编辑器的水平内边距 (0-3) |
| `outputPad` | 数字 | `1` | 用户消息、助手消息和思考过程的水平内边距 (0 或 1) |
| `autocompleteMaxVisible` | 数字 | `5` | 自动完成下拉菜单中最大可见项数 (3-20) |
| `showHardwareCursor` | 布尔值 | `false` | 在 TUI 为支持 IME 而定位光标时显示终端光标 |

对于 VS Code ，包含 `--wait`，以便编辑器退出后 pi 恢复：

```json
{
  "externalEditor": "code --wait"
}
```

### 遥测与更新检查

`enableInstallTelemetry` 仅控制向 `https://pi.dev/api/report-install` 发送匿名安装/更新 ping。选择退出遥测不会禁用更新检查；Pi 仍可获取 `https://pi.dev/api/latest-version` 以查找最新版本。

设置 `PI_SKIP_VERSION_CHECK=1` 以禁用 Pi 版本更新检查。使用 `--offline` 或 `PI_OFFLINE=1` 禁用此处描述的所有启动网络操作，包括更新检查、包更新检查和安装/更新遥测。

### 网络

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `httpProxy` | 字符串 | - | HTTP 代理 URL 作为 `HTTP_PROXY` 和 `HTTPS_PROXY` 应用。仅全局设置。 |

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### 警告

| 设置 | 类型 | 默认值 | 说明 |
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

| 设置 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `compaction.enabled` | 布尔值 | `true` | 启用 auto-compaction |
| `compaction.reserveTokens` | 数字 | `16384` | 为 LLM 响应预留的令牌数 |
| `compaction.keepRecentTokens` | 数字 | `20000` | 保留的近期令牌数(未总结) |

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

### 分支摘要

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `branchSummary.reserveTokens` | 数字 | `16384` | 为分支摘要保留的令牌 |
| `branchSummary.skipPrompt` | 布尔值 | `false` | 在`/tree`导航时跳过"总结分支？"提示 (默认不总结) |

### 重试

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `retry.enabled` | 布尔值 | `true` | 启用自动agent-level重试以应对瞬时错误 |
| `retry.maxRetries` | 数字 | `3` | 最大 agent-level 重试次数 |
| `retry.baseDelayMs` | 数字 | `2000` | agent-level 指数退避的基础延迟 (2s, 4s, 8s) |
| `retry.provider.timeoutMs` | 数字 | SDK 默认值 | 提供商/SDK 请求超时（毫秒） |
| `retry.provider.maxRetries` | 数字 | `0` | 提供商/SDK 重试次数 |
| `retry.provider.maxRetryDelayMs` | 数字 | `60000` | 失败前的最大 server-requested 延迟 (60s) |

当提供商请求的重试延迟超过 `retry.provider.maxRetryDelayMs` 时，请求将立即失败并返回信息性错误，而不会静默等待。将其设置为 `0` 以禁用限制。

除非明确需要 provider-level 重试，否则将 `retry.provider.maxRetries` 保持在 `0`。将其设置高于 `0` 可能会使 SDK/提供商重试在 Pi 看到 out-of-usage-limit 错误之前处理它们，这在某些情况下可能会阻止代理直到提供商配额重置。

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

### 消息投递

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `steeringMode` | 字符串 | `"one-at-a-time"` | 转向消息发送方式：`"all"` 或 `"one-at-a-time"` |
| `followUpMode` | 字符串 | `"one-at-a-time"` | follow-up 消息发送方式：`"all"` 或 `"one-at-a-time"` |
| `transport` | 字符串 | `"auto"` | 支持多种传输的模型提供商的首选传输方式：`"sse"`、`"websocket"`、`"websocket-cached"` 或 `"auto"` |
| `httpIdleTimeoutMs` | 数字 | `300000` | HTTP 头部/正文空闲超时（毫秒），也用于具有显式流空闲超时的模型提供商。设置为 `0` 以禁用。 |
| `websocketConnectTimeoutMs` | 数字 | `15000` | WebSocket 连接/打开握手超时（毫秒），适用于支持 WebSocket 传输的模型提供商。设置为 `0` 以禁用。 |

### 终端与图片

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `terminal.showImages` | 布尔值 | `true` | 在终端中显示图像(（若支持）) |
| `terminal.imageWidthCells` | 数值 | `60` | 终端单元格中首选的内联图像宽度 |
| `terminal.clearOnShrink` | 布尔值 | `false` | 当内容缩小时清除空行(（可能导致闪烁）) |
| `images.autoResize` | 布尔值 | `true` | 将图像最大调整至 2000x2000 |
| `images.blockImages` | 布尔值 | `false` | 阻止所有图像发送到 LLM |

### Shell

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `shellPath` | 字符串 | - | 自定义 shell 路径 (e.g。，适用于 Windows 上的 Cygwin)；支持使用 `~` 开头表示 home 目录 |
| `shellCommandPrefix` | 字符串 | - | 每个 bash 命令的前缀 (e.g。，例如 `"shopt -s expand_aliases"`) |
| `npmCommand` | 字符串[] | - | 用于 npm package 查找/安装操作的命令 argv (e.g。，例如 `["mise", "exec", "node@20", "--", "npm"]`) |

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

`npmCommand` 用于所有 npm package-manager 操作，包括安装、卸载以及在 `~/.pi/agent/npm/` 下 git packages. 用户范围内的 npm packages 安装中的依赖安装；project-scoped npm packages 在 `.pi/npm/` 下的安装。请完全按照进程启动方式使用 argv-style 条目。当配置了 `npmCommand` 时， git package 依赖安装使用纯 `install`，以避免包装器或替代包管理器中的 npm-specific 标志。

### 会话

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `sessionDir` | 字符串 | - | 存储会话文件的目录。接受绝对路径或相对路径，以及 `~`。 |

```json
{ "sessionDir": ".pi/sessions" }
```

当多个来源指定会话目录时，优先级顺序为 `--session-dir`、`PI_CODING_AGENT_SESSION_DIR`、`sessionDir`，位于 settings.json 中。

### 模型循环｜ Model Cycling

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `enabledModels` | string[] | - | 用于 Ctrl+P 循环的模型模式 (格式与 `--models` CLI 标志相同) |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `markdown.codeBlockIndent` | string | `"  "` | 代码块的缩进 |

### 资源｜ Resources

这些设置定义了从何处加载扩展、技能、提示词和主题。

`~/.pi/agent/settings.json` 中的路径相对于 `~/.pi/agent` 解析。`.pi/settings.json` 中的路径相对于 `.pi` 解析。支持绝对路径和 `~`。

| 设置 | 类型 | 默认值 | 描述 |
|---------|------|---------|-------------|
| `packages` | 数组 | `[]` | npm/git packages 从中加载资源 |
| `extensions` | 字符串[] | `[]` | 本地扩展文件路径或目录 |
| `skills` | 字符串[] | `[]` | 本地技能文件路径或目录 |
| `prompts` | 字符串[] | `[]` | 本地提示词模板文件路径或目录 |
| `themes` | 字符串[] | `[]` | 本地主题文件路径或目录 |
| `enableSkillCommands` | 布尔值 | `true` | 将技能注册为 `/skill:name` 命令 |

数组支持 glob 模式和排除项。使用 `!pattern` 排除。使用 `+path` 表示 force-include 精确路径，使用 `-path` 表示 force-exclude 精确路径。

#### packages

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

## Project Overrides ｜ Project Overrides

项目设置 (`.pi/settings.json`) 会覆盖全局设置。嵌套对象会被合并：

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
