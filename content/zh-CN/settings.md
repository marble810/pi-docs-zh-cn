# 设置项|

| `~/.pi/代理/settings.json` | 全局（所有项目） |
| `.pi/settings.json` | 项目（当前目录） |

Edit directly or use `/settings` for common options.

## 项目信任

On interactive startup, pi asks before trusting a project folder that contains project-local settings, resources, or project `.agents/技能` and has no saved decision for the folder or a parent folder in `~/.pi/agent/trust.json`. Trusting a project allows pi to load `.pi/settings.json` and `.pi` resources, install missing project 包, and execute project 扩展.

Non-interactive modes (`-p`, `--mode json`, and `--mode rpc`) do not show a trust prompt. Without an applicable saved trust decision, they use `defaultProjectTrust` from global settings: `ask` (default) and `never` ignore those project resources, while `always` trusts them. Pass `--approve`/`-a` or `--no-approve`/`-na` to override project trust for one run.

If no extension or saved decision applies, `defaultProjectTrust` controls the fallback behavior. Set it to `"ask"`, `"always"`, or `"never"` in `~/.pi/agent/settings.json`, or change it with `/settings`.

`pi config` and package commands use the same project trust flow, except `pi update` never 提示词模板. Pass `--approve` to trust project-local settings for one command or `--no-approve` to ignore them.

Use `/trust` in interactive mode to save a project trust decision for future sessions, including trust for the immediate parent folder. It writes `~/.pi/agent/trust.json` only; the current session is not reloaded, so restart pi for changes to take effect.

## 所有设置

### 模型与思考

| Setting | 类型, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`, `"max"` |
| `hideThinkingBlock` | booleane`| 显示重要提示词缓存未命中的会话记录通知 |
|`thinkingBudgets` | 对象 | - | 每个思考级别的自定义令牌预算 |

#### thinkingBudgets

```json
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 2768
  }
}
```

### 用户界面与显示

| Setting                  | Type    | Default                                                                           | Description                                                                                                            |
| ------------------------ | ------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `theme`                  | string  | `"dark"`                                                                          | Theme name (`"dark"`, `"light"`, or custom)                                                                            |
| `externalEditor`         | string  | `$VISUAL`, then `$EDITOR`, then Notepad on Windows or `nano` elsewhere            | Ctrl+G 外部编辑器的命令；优先级高于环境变量                                                                            |
| `quietStartup`           | boolean | `false`                                                                           | 隐藏启动标题                                                                                                           |
| `defaultProjectTrust`    | string  | `"ask"`                                                                           | Fallback project trust behavior: `"ask"`, `"always"`, or `"never"`. Global setting only                                |
| `collapseChangelog`      | boolean | `false`                                                                           | 更新后显示精简版更新日志                                                                                               |
| `enableInstallTelemetry` | boolean | `true首次安装或检测到更新日志更新后，发送匿名安装/更新版本 ping。这不控制更新检查 |
| `enableAnalytics`        | boolean | `false`                                                                           | Opt-in analytics data sharing. Currently only asked for during the experimental first-time setup (`PI_EXPERIMENTAL=1`) |
| `trackingId`             | string  | -                                                                                 | Analytics tracking identifier, generated when `enableAnalytics` is turned on                                           |
| `doubleEscapeAction`     | string  | `"tree"`                                                                          | Action for double-escape: `"tree"`, `"fork"`, or `"none"`                                                              |
| `treeFilterMode`         | string  | `"default"`                                                                       | Default filter for `/tree`: `"default"`, `"no-tools"`, `"user-only"`, `"labeled-only"`, `"all"`                        |
| `editorPaddingX`         | 数字）  |
| `outputPad`              | number  | `1`                                                                               | 用户消息、助手消息和思考内容的水平内边距（ 0 或 1 ）                                                                   |
| `autocompleteMaxVisible` | number  | `5`                                                                               | 自动完成下拉菜单的最大可见项数（ 3-20 ）                                                                               |
| `showHardwareCursor`     | boolean | `false`                                                                           | 当 TUI 为 IME 支持定位光标时，显示终端光标                                                                             |

For VS Code, include `--wait` so pi resumes after the editor exits:

```json
{
  "externalEditor": "code --wait"
}
```

### 遥测与更新检查

`enableInstallTelemetry` only controls the anonymous install/update ping to `https://pi.dev/api/report-install`. Opting out of telemetry does not disable update checks; Pi can still fetch `https://pi.dev/api/latest-version` to look for the latest version.

Set `PI_SKIP_VERSION_CHECK=1` to disable the Pi version update check. Use `--offline` or `PI_OFFLINE=1` to disable all startup network operations described here, including update checks, package update checks, and install/update telemetry.

### 网络

| Setting     | Type   | Default | Description                                                                    |
| ----------- | ------ | ------- | ------------------------------------------------------------------------------ |
| `httpProxy` | string | -       | HTTP proxy URL applied as `HTTP_PROXY` and `HTTPS_PROXY`. Global setting only. |

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### 警告

| Setting                        | Type    | Default | Description                                         |
| ------------------------------ | ------- | ------- | --------------------------------------------------- |
| `warnings.anthropicExtraUsage` | boolean | `true`  | 当 Anthropic 订阅认证可能使用付费额外用量时显示警告 |

```json
{
  "warnings": {
    "anthropicExtraUsage": false
  }
}
```

### 上下文压缩

| Setting                        | Type    | Default | Description                    |
| ------------------------------ | ------- | ------- | ------------------------------ |
| `上下文压缩。enabled`          | boolean | `true`  | 启用自动上下文压缩             |
| `上下文压缩。reserveTokens`    | number  | ``      | 为 LLM 响应预留的令牌数        |
| `上下文压缩。keepRecentTokens` | number  | `0`     | 保留的最近令牌数（不进行摘要） |

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

| Setting | Type    | Default | Description                                                                    |
| ------- | ------- | ------- | ------------------------------------------------------------------------------ |
| ``      | number  | `16384` |                                                                                |
| ``      | boolean | `false` | Skip "Summarize branch?" prompt on `/tree` navigation (defaults to no summary) |

###

| Setting                              | Type    | Default    | Description                                   |
| ------------------------------------ | ------- | ---------- | --------------------------------------------- |
| ``                                   | boolean | `true`     |                                               |
| ``                                   | number  | `3`        |                                               |
| ``                                   | number  | `2000`     | 代理级指数退避的基础延迟（ 2 秒、4 秒、8 秒） |
| `retry。模型提供商。timeoutMs`       | number  | SDK 默认值 | 模型提供商/SDK 请求超时时间（毫秒）           |
| `retry。模型提供商。maxRetries`      | number  | `0`        | 模型提供商/SDK 重试次数                       |
| `retry。模型提供商。maxRetryDelayMs` | number  | `60000`    | 失败前服务器请求的最大延迟（ 60 秒）          |

When a provider requests a retry delay longer than `retry.provider.maxRetryDelayMs` (e.g., Google's "quota will reset after 5h"), the request fails immediately with an informative error instead of waiting silently. Set to `0` to disable the cap.

Keep `retry.provider.maxRetries` at `0` unless provider-level retries are explicitly needed. Setting it above `0` can make SDK/provider retries handle out-of-usage-limit errors before Pi sees them, which may block the agent until the provider quota resets in some circumstances.

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

| Setting                     | Type   | Default           | Description                                                                                                                      |
| --------------------------- | ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `steeringMode`              | string | `"one-at-a-time"` | How steering messages are sent: `"all"` or `"one-at-a-time"`                                                                     |
| `followUpMode`              | string | `"one-at-a-time"` | How follow-up messages are sent: `"all"` or `"one-at-a-time"`                                                                    |
| `transport`                 | string | `"auto"`          | Preferred transport for providers that support multiple transports: `"sse"`, `"websocket"`, `"websocket-cached"`, or `"auto"`    |
| `httpIdleTimeoutMs`         | number | `300000`          | HTTP header/body idle timeout in milliseconds, also used by providers with explicit stream idle timeouts. Set to `0` to disable. |
| `websocketConnectTimeoutMs` | number | `15000`           | WebSocket connect/open handshake timeout in milliseconds for providers that support WebSocket transports. Set to `0` to disable. |

### 终端与图像

| Setting                 | Type    | Default | Description                          |
| ----------------------- | ------- | ------- | ------------------------------------ |
| `终端。showImages`      | boolean | `true`  | 在终端中显示图像（如果支持）         |
| `终端。imageWidthCells` | number  | `60`    | 终端单元格中首选的内联图像宽度       |
| `终端。clearOnShrink`   | boolean | `false` | 当内容收缩时清除空行（可能导致闪烁） |
| `images.autoResize`     | boolean | `true`  | 将图像最大尺寸调整为 2000x2000       |
| `images.blockImages`    | boolean | `false` | 阻止所有图像发送给 LLM               |

### Shell

| Setting              | Type     | Default | Description                                                                                                    |
| -------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `shellPath`          | string   | -       | Custom shell path (e.g., for Cygwin on Windows); supports a leading `~` for the home directory                 |
| `shellCommandPrefix` | string   | -       | Prefix for every bash command (e.g., `"shopt -s expand_aliases"`)                                              |
| `npmCommand`         | string[] | -       | Command argv used for npm package lookup/install operations (e.g., `["mise", "exec", "node@20", "--", "npm"]`) |

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

`npmCommand` is used for all npm package-manager operations, including installs, uninstalls, and dependency installs inside git packages. User-scoped npm packages install under `~/.pi/agent/npm/`; project-scoped npm packages install under `.pi/npm/`. Use argv-style entries exactly as the process should be launched. When `npmCommand` is configured, git package dependency installs use plain `install` to avoid npm-specific flags in wrappers or alternate package managers.

### 会话

| Setting      | Type   | Default | Description                                                                             |
| ------------ | ------ | ------- | --------------------------------------------------------------------------------------- |
| `sessionDir` | string | -       | Directory where session files are stored. Accepts absolute or relative paths, plus `~`. |

```json
{ "sessionDir": ".pi/sessions" }
```

When multiple sources specify a session directory, precedence is `--session-dir`, `PI_CODING_AGENT_SESSION_DIR`, then `sessionDir` in settings.json.

### 模型轮换

| Setting         | Type     | Default | Description                                                            |
| --------------- | -------- | ------- | ---------------------------------------------------------------------- |
| `enabledModels` | string[] | -       | Model patterns for Ctrl+P cycling (same format as `--models` CLI flag) |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

| Setting                    | Type   | Default | Description  |
| -------------------------- | ------ | ------- | ------------ |
| `markdown.codeBlockIndent` | string | `" "`   | 代码块的缩进 |

### 资源

这些设置定义了从哪里加载扩展、技能、提示词和主题。ths in `~/.pi/agent/settings.json` resolve relative to `~/.pi/agent`. Paths in `.pi/settings.json` resolve relative to `.pi`. Absolute paths and `~` are supported.

| Setting               | Type     | Default | Description                               |
| --------------------- | -------- | ------- | ----------------------------------------- |
| `packages`            | array    | `[]`    | 用于加载资源的 npm/git 包                 |
| `extensions`          | string[] | `[]`    | 本地扩展文件路径或目录                    |
| `skills`              | string[] | `[]`    | 本地技能文件路径或目录                    |
| `prompts`             | string[] | `[]`    | 本地提示词模板路径或目录                  |
| `themes`              | string[] | `[]`    | 本地主题文件路径或目录                    |
| `enableSkillCommands` | boolean  | `true`  | Register skills as `/skill:name` commands |

Arrays support glob patterns and exclusions. Use `!pattern` to exclude. Use `+path` to force-include an exact path and `-path` to force-exclude an exact path.

#### packages

字符串形式从包中加载所有资源：

```json
{
  "packages": ["pi-skills", "@org/my-extension"]
}
```

对象形式筛选要加载的资源：

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

See [packages.md](packages.md) for package management details.

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

Project settings (`.pi/settings.json`) override global settings. Nested objects are merged:

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
