# 环境变量｜ Environment Variables

Pi 以三种方式使用环境变量：

- 诸如 `PI_OFFLINE` 之类的变量用于配置 Pi 进程。
- Pi 设置进程标记，以便子进程可以将 Pi 识别为启动代理。
- 由 LLM 可调用的 shell 工具运行的命令会接收描述当前会话的 `PI_*` 变量。

模型提供商 API 密钥变量在 [模型提供商 Authentication](providers.md#use-an-api-key-from-the-environment) 中单独记录。

## 进程标记｜ Process Marker

CLI 和 RPC 入口点设置两个进程标记：

- `AI_AGENT=pi` 是一个通用标记，可让工具将 Pi 识别为启动该进程的代理。
- `PI_CODING_AGENT=true` 是 Pi 特有的，可让子进程检测到它们运行在 Pi 内。

子进程会同时继承这两个标记。它们不是 session-specific，并且当 Pi 通过 SDK 嵌入时不会自动设置。

## Shell 工具会话环境｜ Shell Tool 会话 Environment

由 `bash` 和 `powershell` 工具运行的命令会接收当前 Pi 会话状态：

| 变量 | 描述 |
|----------|-------------|
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 当前会话 JSONL 文件的绝对路径；对于临时会话未设置 |
| `PI_PROVIDER` | 当前选中的模型提供商 |
| `PI_MODEL` | 当前选中的模型 ID |
| `PI_REASONING_LEVEL` | 当前生效的推理级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` |

这些值会在每条命令启动时解析。因此，切换模型或更改推理级别会影响下一条 shell 命令，而无需重启 Pi。`PI_PROVIDER` 和 `PI_MODEL` 标识的是选中的 Pi 模型，而不是路由器可能在内部选择的其他上游模型。

当被问及正在运行的是哪个模型或提供商时，请检查这些变量，而不是从系统提示词中推断答案：

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

当会话是持久化的时，可以直接检查会话文件：

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

这些变量会被注入到 LLM 可调用的 `bash` 和 `powershell` 工具中。它们不会被注入到 user-entered `!` 或 `!!` 命令中。

### 自定义 Shell 工具｜ Custom Shell Tools

使用 `createBashTool()` 或 `createPowerShellTool()` 创建的工具在注册到 Pi 时默认会暴露会话环境。注入发生在 `spawnHook` 之前，因此钩子会在 `ctx.env` 中接收到这些变量：

```typescript
const bashTool = createBashTool(cwd, {
  spawnHook: (ctx) => ({
    ...ctx,
    env: { ...ctx.env, CI: "1" },
  }),
});
```

独立于 spawn 钩子禁用会话元数据：

```typescript
const powershellTool = createPowerShellTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx,
});
```

禁用后，Pi 会移除这些变量的继承值，以便嵌套的 Pi 进程不会暴露过期的 parent-session 元数据。

## Pi 进程配置｜ Process 配置

这些变量由 Pi 自身读取：

| 变量 | 描述 |
|----------|-------------|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录；默认为 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储；会被 `--session-dir` 覆盖 |
| `PI_PACKAGE_DIR` | 覆盖包目录，适用于 Nix/Guix store 路径 |
| `PI_OFFLINE` | 禁用自动网络活动，包括模型目录刷新 |
| `PI_SKIP_VERSION_CHECK` | 禁用 `pi.dev` latest-version 请求 |
| `PI_TELEMETRY` | 覆盖安装/更新遥测和模型提供商归属标头：`1`/`true`/`yes` 或 `0`/`false`/`no` |
| `PI_CACHE_RETENTION` | 在支持的情况下，设置为 `long` 以启用扩展的模型提供商提示词缓存 |
| `PI_SHARE_VIEWER_URL` | 覆盖 `/share` 使用的基础 URL |
| `PI_RADIUS_GATEWAY` | 覆盖 `/bug` 上传和 Radius 中继连接使用的 Radius 网关源 |
| `PI_HARDWARE_CURSOR` | 设置为 `1` 以显示硬件光标；参见 [终端设置](terminal-setup.md) |
| `PI_HYPERLINKS` | 使用 `1`、`0` 或 `auto` 覆盖 OSC 8 超链接检测 |
| `PI_IMAGE_PROTOCOL` | 使用 `kitty`、`iterm2`、`none` 或 `auto` 覆盖内联图像检测 |
| `PI_TRUE_COLOR` | 使用 `1`、`0` 或 `auto` 覆盖真彩色检测 |
| `PI_TUI_ESC_TIMEOUT` | 在单独的 ESC 之后等待多久才将其视为 Escape ，以毫秒为单位；在 SSH 上默认为 `100`，否则为 `10`。如果 Alt 键输入被误读为 Escape ，请增大此值 |
| `VISUAL`、`EDITOR` | 当 `externalEditor` 未设置时的外部编辑器回退 |
| `HTTP_PROXY`、`HTTPS_PROXY` | 代理出站 HTTP 请求 |

模型提供商凭据（如 `ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 和 cloud-provider 配置）列在 [模型提供商 Authentication](providers.md#use-an-api-key-from-the-environment) 中。
