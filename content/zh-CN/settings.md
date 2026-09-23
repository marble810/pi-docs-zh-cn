# 设置参考｜ Settings Reference

本参考列出了 user-configurable 设置及其类型、默认值和用途。项目设置会覆盖 agent-directory 设置。资源列表会合并。有关文件位置和信任行为，请参阅 [配置](configuration.md)。

## 模型与思考｜ Model and thinking

<a id="model-cycling"></a>

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `defaultProvider` | string | Automatic | 启动 AI 模型提供商。 |
| `defaultModel` | string | Automatic | 启动模型 ID。 |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | `"medium"` | 启动思考级别。 |
| `modelThinkingLevels` | object | None | 按精确的 `provider/modelId` 为键的各模型启动思考级别。 |
| `thinkingBudgets` | object | 内置预算 | `minimal`、`low`、`medium` 和 `high` 思考级别的 token 预算。 |
| `enabledModels` | `string[]` | 所有可用模型 | 用于启动选择和模型循环的模型模式。使用与 `--models` 相同的格式。 |
| `hideThinkingBlock` | boolean | `false` | 在记录中隐藏思考块。 |
| `showCacheMissNotices` | boolean | `false` | 显示关于重大缓存未命中、成功缓存预热、上下文压缩使用以及模型提供商恢复的通知。 |
| `cacheWarming` | `"off" \| "streaming" \| "idle"` | `"streaming"` | 在活动运行期间保持符合条件的模型提供商提示词缓存处于预热状态，或者在使用 `"idle"` 时，在运行之间保持预热。仅限全局设置。 |

仅当模型声明了缓存生命周期，且 Pi 估计可避免的 cache-miss 成本至少为 $0.05 时，缓存预热才会运行。刷新用量会计入会话总计，但不会进入模型上下文。`/session` 显示下一次决策；扩展可以通过 `cache_warming_decision` 覆盖它。参见 [Prompt Cache Lifetimes](models.md#prompt-cache-lifetimes)。

有关模型选择和思考控制，请参见 [Choose a Model](models.md)。

## 交互

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | 排队中的引导消息如何传递。 |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | 排队的 follow-up 消息如何投递。 |
| `externalEditor` | string | `$VISUAL`、`$EDITOR`，然后是平台默认值 | 由 external-editor 键绑定打开的命令。 |
| `doubleEscapeAction` | `"tree" \| "fork" \| "none"` | `"tree"` | 编辑器为空时双击 Escape 的操作。 |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` 使用的初始过滤器。 |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | 回退 project-trust 行为。**只能在 agent-directory 设置中设置。** |

## 工具｜ Tools

| 设置｜ Setting | 类型｜ Type | 默认值｜ Default | 描述 |
|---|---|---|---|
| `defaultTools` | `string[]` | `read`, `bash`, `edit`, `write` | 启动时启用的内置工具。空数组会禁用所有 built-in 工具，但不会禁用扩展或 SDK 工具。 |

可用的 built-in 工具包括 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find` 和 `ls`。CLI 工具选项会针对单次调用覆盖此设置。请参阅 [Command Line](cli.md#tools)。

## 会话与上下文｜ Sessions and context

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `sessionDir` | string | 代理会话目录 | 会话存储目录。相对路径从工作目录解析。`PI_CODING_AGENT_SESSION_DIR` 和 `--session-dir` 会覆盖此设置。 |

### 上下文压缩｜上下文压缩

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `compaction.enabled` | boolean | `true` | 启用自动上下文压缩。 |
| `compaction.reserveTokens` | number | `16384` | 为模型响应保留的 token 数。 |
| `compaction.keepRecentTokens` | number | `20000` | 保留而不进行摘要的近期 token 数。 |
| `compaction.modelOverrides` | object | None | 按精确的 `provider/modelId` 键控的每模型 token 设置。 |

<a id="per-model-compaction-overrides"></a>

上下文压缩的 token 值必须是 non-negative 安全整数。每个值独立解析，依次从匹配的模型覆盖、普通上下文压缩设置，再到 built-in 默认值。项目和用户对象在模型查找之前合并。

有关触发、摘要和验证行为，请参阅 [上下文压缩 Reference](compaction.md)。

### 分支摘要｜ Branch summaries

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `branchSummary.reserveTokens` | number | `16384` | 摘要分支历史时保留的 token 数。 |
| `branchSummary.skipPrompt` | 布尔值 | `false` | 跳过 branch-summary 提示并默认不生成摘要。 |

## 终端与显示｜终端 and display

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `theme` | 字符串 | 自动检测 | 内置或自定义主题名称。 |
| `quietStartup` | 布尔值 | `false` | 隐藏启动标题。 |
| `tuiMode` | `"regular" \| "fullscreen"` | `"regular"` | 交互式终端 UI 模式。 |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | 退出全屏模式时输出的内容。 |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | 全屏转录滚动条行为。 |
| `fullscreenCopyOnSelect` | boolean | `true` | 在全屏模式下自动复制选中的文本。 |
| `editorPaddingX` | number | `0` | 编辑器水平内边距，从 0 到 3 个单元格。 |
| `outputPad` | `0 \| 1` | `1` | 转录水平内边距。 |
| `autocompleteMaxVisible` | number | `5` | 可见的自动补全条目数，从 3 到 20。 |
| `showHardwareCursor` | boolean | `false` | 在 Pi 为输入法定位光标时显示终端光标。 |
| `terminal.showImages` | boolean | `true` | 在支持时显示内联图像。 |
| `terminal.imageWidthCells` | number | `60` | 内联图像在终端单元格中的首选宽度。 |
| `terminal.clearOnShrink` | boolean | `false` | 当渲染内容收缩时清除空行。 |
| `terminal.showTerminalProgress` | boolean | `false` | 在终端标签页中显示 OSC 9;4 进度。 |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | 覆盖 OSC 8 超链接检测。 |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | 覆盖 inline-image 协议检测。 |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | 覆盖 true-color 检测。 |
| `images.autoResize` | boolean | `true` | 在将图片发送给模型之前，将其尺寸调整为最大 2000 x 2000 像素。 |
| `images.blockImages` | boolean | `false` | 阻止将图片发送给模型。 |
| `markdown.codeBlockIndent` | string | `"  "` | 用于缩进渲染代码块的前缀。 |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid 渲染模式。 |

有关格式和平台详情，请参阅 [Themes](themes.md) 和 [终端 Setup](terminal-setup.md)。

## 网络与重试｜ Network and retries

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `transport` | `"auto" \| "sse" \| "websocket" \| "websocket-cached"` | `"auto"` | 支持多种传输方式的 AI 模型提供商的首选传输方式。 |
| `httpProxy` | string | 无 | 代理 URL 以 `HTTP_PROXY` 和 `HTTPS_PROXY` 的形式应用于 Pi 管理的 HTTP 客户端。**只能在 agent-directory 设置中配置。** |
| `httpIdleTimeoutMs` | number | `300000` | HTTP 标头和正文空闲超时时间，单位为毫秒。设置为 `0` 可禁用。 |
| `websocketConnectTimeoutMs` | number | `15000` | WebSocket 连接超时时间，单位为毫秒。设置为 `0` 可禁用。 |
| `retry.enabled` | boolean | `true` | 为瞬时故障启用自动 agent-level 重试。 |
| `retry.maxRetries` | number | `3` | agent-level 最大重试次数。 |
| `retry.baseDelayMs` | number | `2000` | 初始 exponential-backoff 延迟，单位为毫秒。 |
| `retry.maxAgentDelayMs` | number | `60000` | agent-level 最大重试延迟，单位为毫秒。 |
| `retry.provider.timeoutMs` | number | `httpIdleTimeoutMs` | 模型提供商请求超时，单位为毫秒。 |
| `retry.provider.maxRetries` | number | `0` | 模型提供商级别的重试次数。 |
| `retry.provider.maxRetryDelayMs` | number | `60000` | server-requested 最大延迟，单位为毫秒。设置为 `0` 可禁用该限制。 |

除非需要 provider-level 重试，否则请将 `retry.provider.maxRetries` 保持为 `0`。模型提供商重试可能会延迟 Pi 自行处理配额和 usage-limit 错误。

## Shell ｜ Shell

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `shellPath` | string | 平台默认值 | 自定义 shell 可执行文件路径。支持前置的 `~`。 |
| `shellCommandPrefix` | string | 无 | 添加到每条 shell 命令前的前缀。 |
| `npmCommand` | `string[]` | `npm` | 用于 npm package 查找和安装的命令及参数。 |

有关 shell 设置，请参阅 [Shell 别名](shell-aliases.md)；有关 package-manager 行为，请参阅 [Pi 包](packages.md)。

## 资源｜ Resources

用户设置中的资源路径从代理目录解析。项目设置中的路径从项目 `.pi` 目录解析。支持绝对路径和 `~`。

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `packages` | array | `[]` | npm、git 或本地 Pi 包源。参见 [Pi Packages](packages.md)。 |
| `extensions` | `string[]` | `[]` | 扩展文件或目录。 |
| `skills` | `string[]` | `[]` | 技能文件或目录。 |
| `prompts` | `string[]` | `[]` | 提示词模板文件或目录。 |
| `themes` | `string[]` | `[]` | 主题文件或目录。 |
| `enableSkillCommands` | boolean | `true` | 将技能注册为 `/skill:name` 命令。 |

资源数组支持使用 `!pattern` 进行 glob 排除、使用 `+path` 进行精确包含，以及使用 `-path` 进行精确排除。Pi 会加载 user-level 和项目设置中列出的资源。

## 更新、遥测和警告｜ Updates, telemetry, and warnings

| 设置 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `collapseChangelog` | boolean | `false` | 在更新后显示精简的变更日志。 |
| `enableInstallTelemetry` | boolean | `true` | 启用匿名安装/更新报告以及选定的模型提供商归因标头。不控制更新检查。 |
| `enableAnalytics` | boolean | `false` | 选择加入分析数据共享。目前仅由实验性的 first-run 设置使用。 |
| `warnings.anthropicExtraUsage` | boolean | `true` | 当 Anthropic 订阅身份验证可能使用付费额外用量时发出警告。 |
