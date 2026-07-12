# 设置

Pi使用JSON设置文件，项目设置会覆盖全局设置。

| 位置                        | 作用域         |
| --------------------------- | -------------- |
| `~/.pi/agent/settings.json` | 全局(所有项目) |
| `.pi/settings.json`         | 项目(当前目录) |

可直接编辑或使用`/settings`进行常用选项设置。

## 项目信任

在交互式启动时，如果项目文件夹包含project-local设置、资源或项目`.agents/skills`，并且在`~/.pi/agent/trust.json`中没有该文件夹或其父文件夹的已保存决定， pi 会询问是否信任该文件夹。信任项目允许 pi 加载`.pi/settings.json`和`.pi`资源、安装缺失的项目包以及执行项目扩展。

非交互模式(`-p`、`--mode json`和`--mode rpc`)不会显示信任提示。如果没有适用的已保存信任决策，它们会使用全局设置中的`defaultProjectTrust`：`ask`(默认)和`never`会忽略这些项目资源，而`always`会信任它们。传递`--approve`/`-a`或`--no-approve`/`-na`可覆盖单次运行的项目信任。

如果没有适用的扩展或已保存的决策，`defaultProjectTrust`将控制回退行为。可在`~/.pi/agent/settings.json`中将其设置为`"ask"`、`"always"`或`"never"`，或使用`/settings`进行更改。

`pi config`和包命令使用相同的项目信任流程，但`pi update`从不提示。传递`--approve`可信任单次命令的project-local设置，或传递`--no-approve`忽略它们。

在交互模式下使用`/trust`可保存项目信任决策以供将来会话使用，包括对直接父文件夹的信任。它仅写入`~/.pi/agent/trust.json`；当前会话不会重新加载，因此需重启 pi 以使更改生效。

## 所有设置

### 模型与思考

| 设置                   | 类型    | 默认值  | 描述                                                                    |
| ---------------------- | ------- | ------- | ----------------------------------------------------------------------- |
| `defaultProvider`      | string  | -       | 默认模型提供商 (e.g., `"anthropic"`, `"openai"`)                        |
| `defaultModel`         | string  | -       | 默认模型 ID                                                             |
| `defaultThinkingLevel` | string  | -       | `"off"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`, `"max"` |
| `hideThinkingBlock`    | boolean | `false` | 在输出中隐藏思考块                                                      |
| `showCacheMissNotices` | boolean | `false` | 显示重要 prompt-cache 未命中的转录通知                                  |
| `thinkingBudgets`      | 对象    | -       | 按思考等级自定义 token 预算                                             |

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

### 界面与显示

| 设置项                   | 类型   | 默认值                                                                  | 描述                                                                                     |
| ------------------------ | ------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `theme`                  | 字符串 | `"dark"`                                                                | 主题名称 (`"dark"`、`"light"` 或自定义)                                                  |
| `externalEditor`         | 字符串 | `$VISUAL`，其次 `$EDITOR`，再次 Windows 上的记事本或其他系统上的 `nano` | Ctrl+G 外部编辑器的命令；优先级高于环境变量                                              |
| `quietStartup`           | 布尔值 | `false`                                                                 | 隐藏启动页头                                                                             |
| `defaultProjectTrust`    | 字符串 | `"ask"`                                                                 | 项目信任回退行为：`"ask"`、`"always"`或`"never"`。仅全局设置。                           |
| `collapseChangelog`      | 布尔值 | `false`                                                                 | 更新后显示精简更新日志                                                                   |
| `enableInstallTelemetry` | 布尔值 | `true`                                                                  | 在首次安装或 changelog-detected 次更新后发送匿名安装/更新版本 ping。此操作不控制更新检查 |
| `enableAnalytics`        | 布尔值 | `false`                                                                 | 选择参与分析数据共享。目前仅在实验性 first-time 设置 (`PI_EXPERIMENTAL=1`) 期间询问      |
| `trackingId`             | 字符串 | -                                                                       | 分析跟踪标识符，在开启 `enableAnalytics` 时生成                                          |
| `doubleEscapeAction`     | 字符串 | `"tree"`                                                                | double-escape 的操作：`"tree"`、`"fork"` 或 `"none"`                                     |
| `treeFilterMode`         | 字符串 | `"default"`                                                             | `/tree`的默认过滤器：`"default"`、`"no-tools"`、`"user-only"`、`"labeled-only"`、`"all"` |
| `editorPaddingX`         | 数字   | `0`                                                                     | 输入编辑器的水平内边距 (0-3)                                                             |
| `outputPad`              | 数字   | `1`                                                                     | 用户消息、助手消息和思考内容的水平内边距 (0 或 1)                                        |
| `autocompleteMaxVisible` | 数字   | `5`                                                                     | 自动补全下拉列表中最大可见项数 (3-20)                                                    |
| `showHardwareCursor`     | 布尔值 | `false`                                                                 | 当 TUI 为支持 IME 而定位终端光标时，显示该光标                                           |

对于 VS Code ，请包含 `--wait`，以便 pi 在编辑器退出后恢复运行：

```json
{
  "externalEditor": "code --wait"
}
```

### 遥测与更新检查

`enableInstallTelemetry` 仅控制向 `https://pi.dev/api/report-install` 发送匿名安装/更新 ping。选择退出遥测不会禁用更新检查；Pi 仍然可以获取 `https://pi.dev/api/latest-version` 以查找最新版本。

设置 `PI_SKIP_VERSION_CHECK=1` 可禁用 Pi 版本更新检查。使用 `--offline` 或 `PI_OFFLINE=1` 可禁用此处描述的所有启动网络操作，包括更新检查、包更新检查以及安装/更新遥测。

### 网络

| 设置        | 类型   | 默认值 | 描述                                                             |
| ----------- | ------ | ------ | ---------------------------------------------------------------- |
| `httpProxy` | 字符串 | -      | HTTP 代理 URL 应用于 `HTTP_PROXY` 和 `HTTPS_PROXY`。仅全局设置。 |

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### 警告

| 设置项                         | 类型   | 默认值 | 描述                                                |
| ------------------------------ | ------ | ------ | --------------------------------------------------- |
| `warnings.anthropicExtraUsage` | 布尔值 | `true` | 当 Anthropic 订阅认证可能使用付费附加用量时显示警告 |

```json
{
  "warnings": {
    "anthropicExtraUsage": false
  }
}
```

### 上下文压缩

| 设置项                        | 类型   | 默认值  | 描述                      |
| ----------------------------- | ------ | ------- | ------------------------- |
| `compaction.enabled`          | 布尔值 | `true`  | 启用auto-compaction       |
| `compaction.reserveTokens`    | 数字   | `16384` | 为 LLM 响应预留的令牌数   |
| `compaction.keepRecentTokens` | 数字   | `20000` | 保留的最近令牌数 (未总结) |

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

### 分支总结

| 设置                          | 类型    | 默认值  | 描述                                                   |
| ----------------------------- | ------- | ------- | ------------------------------------------------------ |
| `branchSummary.reserveTokens` | number  | `16384` | 为分支摘要预留的令牌数                                 |
| `branchSummary.skipPrompt`    | boolean | `false` | 在 `/tree` 导航时跳过“是否摘要分支？”提示 (默认不摘要) |

### 重试

| 设置                             | 类型    | 默认值   | 描述                                        |
| -------------------------------- | ------- | -------- | ------------------------------------------- |
| `retry.enabled`                  | boolean | `true`   | 在临时错误时启用自动 agent-level 重试       |
| `retry.maxRetries`               | number  | `3`      | 最大 agent-level 重试次数                   |
| `retry.baseDelayMs`              | number  | `2000`   | agent-level 指数退避的基础延迟 (2s, 4s, 8s) |
| `retry.provider.timeoutMs`       | number  | SDK 默认 | 模型提供商/SDK 请求超时时间（毫秒）         |
| `retry.provider.maxRetries`      | number  | `0`      | 模型提供商/SDK 重试次数                     |
| `retry.provider.maxRetryDelayMs` | number  | `60000`  | 失败前最大 server-requested 延迟 (60s)      |

当模型提供商请求的重试延迟超过 `retry.provider.maxRetryDelayMs` (e.g., Google 的 "配额将在 5 小时后重置") 时，请求会立即失败并显示有意义的错误信息，而不是静默等待。设置为 `0` 可禁用上限。

除非明确需要 provider-level 重试，否则请将 `retry.provider.maxRetries` 保持在 `0`。将其设置为高于 `0` 可能会让 SDK/模型提供商的重试在 Pi 看到之前处理 out-of-usage-limit 错误，这可能会在某些情况下阻止代理，直到模型提供商配额重置。

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

| 设置                        | 类型   | 默认值            | 描述                                                                                                  |
| --------------------------- | ------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `steeringMode`              | 字符串 | `"one-at-a-time"` | 引导消息的发送方式：`"all"` 或 `"one-at-a-time"`                                                      |
| `followUpMode`              | 字符串 | `"one-at-a-time"` | follow-up 消息如何发送：`"all"` 或 `"one-at-a-time"`                                                  |
| `transport`                 | 字符串 | `"auto"`          | 支持多种传输的模型提供商的首选传输方式：`"sse"`、`"websocket"`、`"websocket-cached"` 或 `"auto"`      |
| `httpIdleTimeoutMs`         | 数字   | `300000`          | HTTP 标头/主体空闲超时时间（毫秒），也用于具有显式流空闲超时的模型提供商。设置为 `0` 以禁用。         |
| `websocketConnectTimeoutMs` | 数字   | `15000`           | WebSocket 连接/打开握手的超时时间（毫秒），适用于支持 WebSocket 传输的模型提供商。设置为 `0` 以禁用。 |

### 终端和图像

| 设置                       | 类型   | 默认值  | 描述                               |
| -------------------------- | ------ | ------- | ---------------------------------- |
| `terminal.showImages`      | 布尔值 | `true`  | 在终端中显示图像(如果支持)         |
| `terminal.imageWidthCells` | 数字   | `60`    | 终端单元格中首选的内联图像宽度     |
| `terminal.clearOnShrink`   | 布尔值 | `false` | 当内容缩小时清除空行(可能导致闪烁) |
| `images.autoResize`        | 布尔值 | `true`  | 将图片最大调整为 2000x2000 像素    |
| `images.blockImages`       | 布尔值 | `false` | 阻止所有图片发送到 LLM             |

### Shell

| 设置                 | 类型     | 默认值 | 描述                                                                                       |
| -------------------- | -------- | ------ | ------------------------------------------------------------------------------------------ |
| `shellPath`          | 字符串   | -      | 自定义 shell 路径 (e.g，适用于 Windows 上的 Cygwin)；支持以 `~` 开头表示用户主目录         |
| `shellCommandPrefix` | 字符串   | -      | 每个 bash 命令的前缀 (e.g，如 `"shopt -s expand_aliases"`)                                 |
| `npmCommand`         | 字符串[] | -      | 用于npm package查找/安装操作的命令 argv (e.g., `["mise", "exec", "node@20", "--", "npm"]`) |

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

`npmCommand` 用于所有 npm package-manager操作，包括git packages.中的安装、卸载和依赖安装。用户作用域npm packages安装位于`~/.pi/agent/npm/`下；project-scoped npm packages安装位于`.pi/npm/`下。请使用argv-style条目，与进程启动方式完全相同。当配置了`npmCommand`时， git package依赖安装使用纯`install`，以避免包装器或其他包管理器中的npm-specific标志。

### 会话

| 设置         | 类型   | 默认值 | 描述                                                 |
| ------------ | ------ | ------ | ---------------------------------------------------- |
| `sessionDir` | 字符串 | -      | 存储会话文件的目录。接受绝对路径、相对路径以及 `~`。 |

```json
{ "sessionDir": ".pi/sessions" }
```

当多个来源指定会话目录时，优先级顺序为 `--session-dir`、`PI_CODING_AGENT_SESSION_DIR`，然后是 `sessionDir`，在 settings.json 中。

### 模型轮换

| 设置            | 类型     | 默认值 | 描述                                                        |
| --------------- | -------- | ------ | ----------------------------------------------------------- |
| `enabledModels` | string[] | -      | 用于 Ctrl+P 循环的模型模式 (格式与 `--models` CLI 标志相同) |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

| 设置                       | 类型   | 默认值 | 描述         |
| -------------------------- | ------ | ------ | ------------ |
| `markdown.codeBlockIndent` | string | `"  "` | 代码块的缩进 |

### 资源

这些设置定义了从中加载扩展、技能、提示词和主题的位置。

路径在`~/.pi/agent/settings.json`中是相对于`~/.pi/agent`解析的。路径在`.pi/settings.json`中是相对于`.pi`解析的。支持绝对路径和`~`。

| 设置                  | 类型     | 默认值 | 描述                          |
| --------------------- | -------- | ------ | ----------------------------- |
| `packages`            | array    | `[]`   | 从 npm/git packages 加载资源  |
| `extensions`          | 字符串[] | `[]`   | 本地扩展文件路径或目录        |
| `skills`              | 字符串[] | `[]`   | 本地技能文件路径或目录        |
| `prompts`             | 字符串[] | `[]`   | 本地提示词模板路径或目录      |
| `themes`              | 字符串[] | `[]`   | 本地主题文件路径或目录        |
| `enableSkillCommands` | 布尔值   | `true` | 将技能注册为`/skill:name`命令 |

数组支持 glob 模式和排除项。使用 `!pattern` 排除。使用 `+path` force-include 精确路径，使用 `-path` force-exclude 精确路径。

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

参见 [packages.md](packages.md) 了解包管理详情。

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
