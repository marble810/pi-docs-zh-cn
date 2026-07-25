# 环境变量

Pi通过三种方式使用环境变量：

- 诸如`PI_OFFLINE`之类的变量配置Pi进程。
- Pi设置`PI_CODING_AGENT`，以便子进程可以检测到它们在Pi内运行。
- 由LLM可调用的 bash 工具运行的命令接收描述当前会话的`PI_*`变量。

提供商API-key 变量分别在 [Providers](providers.md#environment-variables-or-auth-file) 中记录。

## Process Marker ｜ Process Marker

CLI 和 RPC 入口点设置 `PI_CODING_AGENT=true`。子进程会继承该值，并可用于检测它们是否运行在 Pi 内部。它不是 session-specific，且当 Pi 通过 SDK 嵌入时不会自动设置。

## Bash 工具会话环境｜ Bash Tool 会话 Environment

由 bash 工具运行的命令接收当前 Pi 会话状态：

| 变量 | 描述 |
|----------|-------------|
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 当前会话 JSONL 文件的绝对路径；临时会话未设置。 |
| `PI_PROVIDER` | 当前选择的模型提供商 |
| `PI_MODEL` | 当前选择的模型 ID |
| `PI_REASONING_LEVEL` | 当前有效推理级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` |

这些值在每个命令启动时解析。因此，切换模型或更改推理级别会影响下一条 bash 命令，而无需重启 Pi。`PI_PROVIDER` 和 `PI_MODEL` 标识所选的 Pi 模型，而非路由器可能在内部选择的不同上游模型。

当被询问正在运行哪个模型或提供商时，请检查这些变量，而不是从系统提示词推断答案：

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

当会话持久时，可以直接检查会话文件：

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

这些变量被注入到 LLM 可调用的 bash 工具中。它们不会被注入到 user-entered `!` 或 `!!` 命令。

### 自定义 Bash 工具｜ Custom Bash Tools

使用 `createBashTool()` 创建的 bash 工具在通过 Pi 注册时默认暴露会话环境。注入发生在 `spawnHook` 之前，因此钩子会在 `ctx.env` 中接收到这些变量：

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
const bashTool = createBashTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx,
});
```

当禁用时，Pi 会移除这些变量的继承值，这样嵌套的 Pi 进程就不会暴露过时的 parent-session 元数据。

## Pi 进程配置

以下变量由 Pi 自身读取：

| 变量 | 描述 |
|----------|-------------|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录；默认为 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储；可由 `--session-dir` 覆盖 |
| `PI_PACKAGE_DIR` | 覆盖包目录，适用于 Nix/Guix 存储路径 |
| `PI_OFFLINE` | 禁用启动时网络操作，包括更新检查、包更新以及安装/更新遥测 |
| `PI_SKIP_VERSION_CHECK` | 禁用 `pi.dev` latest-version 请求 |
| `PI_TELEMETRY` | 覆盖安装/更新遥测和模型提供商归属头：`1`/`true`/`yes` 或 `0`/`false`/`no` |
| `PI_CACHE_RETENTION` | 设置为 `long` 以在支持的情况下启用扩展的模型提供商提示缓存 |
| `PI_SHARE_VIEWER_URL` | 覆盖 `/share` 所使用的 URL 基址 |
| `PI_HARDWARE_CURSOR` | 设置为 `1` 以显示硬件光标；参见 [终端设置](terminal-setup.md) |
| `VISUAL`, `EDITOR` | 当 `externalEditor` 未设置时的外部编辑器回退 |
| `HTTP_PROXY`、`HTTPS_PROXY` | 代理出站 HTTP 请求 |

模型提供商凭据（如 `ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 和 cloud-provider 配置）列在 [Providers](providers.md#environment-variables-or-auth-file) 中。
