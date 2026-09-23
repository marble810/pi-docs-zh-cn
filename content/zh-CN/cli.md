<a id="cli-and-modes-reference"></a>

# 命令行界面｜ Command Line

本页记录了 Pi 的 built-in command-line 命令和选项。运行 `pi --help` 或在命令后附加 `--help`，以查看你所安装版本的确切接口。top-level 帮助还包含已加载扩展注册的选项。

```sh
pi [options] [--] [@files...] [messages...]
pi install <source> [options]
pi remove <source> [options]
pi uninstall <source> [options]
pi update [target] [options]
pi list
pi config [options]
pi auth <check|print-api-key|print-bearer-token> [options]
```

<a id="modes"></a>

## 调用与输出｜ Invocation and output

```sh
pi
pi --print "Summarize this repository"
git diff | pi --print "Review this change"
pi --mode json "Inspect this repository" > events.jsonl
```

在终端 stdin 和 stdout 下，除非 `--print`、`--mode json` 或 `--mode rpc` 选择其他接口，否则 Pi 会打开终端 UI。当任一数据流被重定向且未选择 JSON 或 RPC 模式时，Pi 使用打印模式。有关在交互式、打印、JSON、RPC 和 SDK 集成之间进行选择，请参阅 [CLI Integration](cli-integration.md)。

| 输入｜ Input | 行为 |
|---|---|
| `message` | 提供初始提示词 |
| `@path` | 在首个提示词中包含文本文件或图像 |
| 管道标准输入 | 将其内容前置到首个提示词 |
| `--` | 停止选项解析，使提示词可以以 `-` 开头 |

Pi 从当前工作目录解析 `@path`。工作目录还控制项目配置、资源发现和会话分组。

`--print` 控制 Pi 是否运行一次后退出。`--mode` 选择输出界面。当 stdin 和 stdout 为终端时，`--mode text` 不会强制 one-shot 执行；如需该行为，请使用 `--print`。

| 选项 | 行为 |
|---|---|
| `-p`、`--print` | 运行提供的提示词，将最终助手文本写入 stdout ，然后退出 |
| `--mode text` | 选择文本输出；当 stdin 和 stdout 为终端时仍打开终端 UI |
| `--mode json` | 运行提供的提示词，将 JSONL 事件写入 stdout ，然后退出 |
| `--mode rpc` | 从 stdin 读取 JSONL 命令，并将响应和事件写入 stdout ，直到关闭 |
| `--export <input> [output]` | 将会话文件导出到 HTML 并退出；省略 `output` 时推导目标位置 |

RPC 模式拒绝 `@file` 参数。JSON 和 RPC 模式将 stdout 保留给协议记录。参见 [JSON Event Stream](json.md) 和 [RPC Protocol](rpc.md)。

<a id="model-options"></a>

## 模型｜ Models

```sh
pi --model sonnet:high
```

模型选择和凭据相关信息，请参阅 [选择模型](models.md) 和 [模型提供商认证](providers.md)。

- `--provider <name>`<br>
 将 `--model` 查找限制为单个模型提供商。
- `--model <pattern>`<br>
 按精确 ID 或模糊 ID/名称匹配进行选择。它接受 `provider/id` 以及可选的 `:<thinking>` 后缀。
- `--api-key <key>`<br>
 使用 non-persistent API 密钥覆盖。它要求通过 `--model` 或 `--models` 选择模型。
- `--thinking <level>`<br>
 设置 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max`。它会覆盖 `--model` 后缀，并被限制在模型的能力范围内。
- `--models <patterns>`<br>
 为启动和循环设置 comma-separated 范围。它接受精确 ID、模糊匹配、case-insensitive glob 以及可选的 `:<thinking>` 后缀。
- `--list-models [search]`<br>
 列出可用模型，可选地按模糊搜索过滤，然后退出。

<a id="session-options"></a>

## 会话｜ Sessions

```sh
pi --continue
```

有关恢复、分叉、命名和存储会话的信息，请参阅 [会话与上下文](sessions.md)。

- `-c`、`--continue`<br>
 继续当前项目最近的会话。
- `-r`、`--resume`<br>
 打开会话选择器。
- `--session <path|id>`<br>
 按文件路径、精确 ID 或部分 ID 打开。Pi 会先搜索当前项目，并提供分叉 cross-project 匹配项。
- `--session-id <id>`<br>
 打开精确的项目会话 ID ，如果不存在则创建它。ID 接受字母、数字、`.`、`_` 和 `-`。
- `--fork <path|id>`<br>
 将现有会话分叉为当前项目的新会话。
- `--session-dir <dir>`<br>
 覆盖存储和查找。它优先于 `PI_CODING_AGENT_SESSION_DIR` 和 `sessionDir` 设置。
- `--no-session`<br>
 使用不持久化的 in-memory 会话。
- `-n`、`--name <name>`<br>
 设置会话显示名称。

约束：

- 会话 ID 必须以字母或数字开头和结尾。
- `--fork` 不能与 `--session`、`--continue`、`--resume` 或 `--no-session` 组合使用。
- `--session-id` 不能与 `--session`、`--continue` 或 `--resume` 组合使用。将其与 `--fork` 组合以选择新 ID。

<a id="tool-options"></a>

## 工具｜ Tools

```sh
pi --tools read,grep,find,ls --print "Review this project"
```

参见 [Settings](settings.md#tools) 以配置默认工具选择。

- `-t`、`--tools <list>`<br>
 用 built-in、扩展或自定义工具的 comma-separated 允许列表替换默认选择。
- `-xt`、`--exclude-tools <list>`<br>
 在所有其他选择选项之后禁用 comma-separated 工具名称。
- `-nbt`、`--no-builtin-tools`<br>
 禁用默认 built-in 工具，同时保留扩展和自定义工具。
- `-nt`、`--no-tools`<br>
 以禁用所有 built-in、扩展和自定义工具的状态启动。

默认启用的工具为 `read`、`bash`、`edit` 和 `write`，除非 `defaultTools` 更改它们。

| 内置 | 用途 |
|---|---|
| `read` | 读取文本文件和支持的图像 |
| `bash` | 运行 shell 命令 |
| `powershell` | 在 Windows 上运行 PowerShell 命令 |
| `edit` | 对现有文件应用精确文本替换 |
| `write` | 创建或覆盖文件 |
| `grep` | 搜索文件内容 |
| `find` | 使用 glob 模式查找路径 |
| `ls` | 列出目录内容 |

<a id="resource-options"></a>

## 资源｜ Resources

```sh
pi --extension ./review.ts
```

有关常规目录和项目信任，请参阅 [配置](configuration.md)；有关配置的路径，请参阅 [Settings](settings.md#resources)；有关包来源，请参阅 [Pi Packages](packages.md)。

- `-e`, `--extension <path>`<br>
 加载扩展文件或目录，可重复使用。
- `-ne`, `--no-extensions`<br>
 禁用已发现和已配置的扩展。显式指定的 `-e` 路径仍会加载。
- `--skill <path>`<br>
 加载技能文件或目录，可重复使用。
- `-ns`, `--no-skills`<br>
 禁用已发现和已配置的技能。显式指定的 `--skill` 路径仍会加载。
- `--prompt-template <path>`<br>
 加载 prompt-template 文件或目录，可重复使用。
- `-np`, `--no-prompt-templates`<br>
 禁用已发现和已配置的模板。显式指定的 `--prompt-template` 路径仍会加载。
- `--theme <path>`<br>
 加载主题文件或目录，可重复使用。
- `--use-theme <name[/name]>`<br>
 选择本次运行的初始交互式主题。
- `--no-themes`<br>
 禁用已发现和已配置的主题。显式指定的 `--theme` 路径仍会加载。
- `-nc`, `--no-context-files`<br>
 禁用 `AGENTS.md` 和 `CLAUDE.md` 发现。

资源路径仅适用于当前进程。相对路径从当前工作目录解析。

<a id="prompt-and-display-options"></a>

## 提示词与进程｜ Prompts and process

```sh
pi --append-system-prompt ./instructions.md
```

有关保存的配置，请参阅 [配置](configuration.md)；有关项目信任，请参阅 [Security](security.md#understand-project-trust)；有关进程控制，请参阅 [Environment Variables](environment-variables.md)。

- `--system-prompt <text|path>`<br>
 用文本或现有文件的内容替换默认系统提示词。
- `--append-system-prompt <text|path>`<br>
 将文本或现有文件追加到系统提示词，可重复使用。
- `--tui-mode <mode>`<br>
 使用 `regular` 或 `fullscreen` 终端模式。
- `--verbose`<br>
 显示详细的交互式启动信息，覆盖 `quietStartup`。
- `-a`, `--approve`<br>
 为此进程信任 project-local 配置和资源。
- `-na`、`--no-approve`<br>
 忽略此进程的 trust-gated project-local 配置和资源。
- `--offline`<br>
 禁用自动网络活动，包括模型目录刷新。等同于 `PI_OFFLINE=1`。
- `-h`、`--help`<br>
 显示帮助，包括已加载扩展注册的标志，然后退出。
- `-v`、`--version`<br>
 显示 Pi 版本，然后退出。

扩展可以注册额外的 long-form 选项。未知的短选项会被拒绝。

## 包命令｜ Package commands

```sh
pi install npm:@scope/package
```

有关 source formats、过滤、安装和项目范围的信息，请参阅 [Pi Packages](packages.md)。

### 常见任务｜ Common tasks

| 任务｜ Task | 命令｜ Command |
|---|---|
| 安装包｜ Install a package | `pi install <source>` |
| 列出已配置的包｜ List configured packages | `pi list` |
| 移除包及其设置条目｜ Remove a package and its settings entry | `pi remove <source>` |
| 配置加载哪些包资源｜ Configure which package resources load | `pi config` |

将 `--local` 或 `-l` 添加到 `install`、`remove`、`uninstall` 或 `config`，以使用项目设置而非全局设置。

### 更新 Pi 或包｜ Update Pi or packages

运行不带目标的 `pi update` 会更新 Pi 本身。

| 任务｜ Task | 命令｜ Command |
|---|---|
| 更新 Pi｜ Update Pi | `pi update` |
| 更新所有已安装的包 | `pi update --extensions` |
| 更新一个已安装的包 | `pi update <source>` |
| 刷新模型目录 | `pi update --models` |
| 更新 Pi 及所有已安装的包 | `pi update --all` |

当所选更新包含 Pi 时，添加 `--force` 以重新安装 Pi。

### 别名与命令选项

- `pi uninstall <source>` 是 `pi remove <source>` 的别名。
- `pi update --self`、`pi update self` 和 `pi update pi` 是 `pi update` 的别名。
- `pi update --extension <source>` 是 `pi update <source>` 的别名。
- `-a`，`--approve` 为单条命令信任 project-local 文件。`-na`，`--no-approve` 忽略 trust-gated project-local 文件。
- 在命令后追加 `-h` 或 `--help`，以查看其确切用法和选项约束。

## 凭据命令

```sh
pi auth check --provider openai --json
```

身份验证命令需要 `--provider <provider>` 或 `--model <model>`。支持的方法请参见 [模型提供商 Authentication](providers.md)。

| 命令 | 描述 |
|---|---|
| `pi auth check` | 打印 `ready`、`not_ready` 或 `invalid`；分别以状态码 `0`、`1` 或 `2` 退出 |
| `pi auth print-api-key` | 打印解析后的 API 密钥 |
| `pi auth print-bearer-token` | 打印解析后的 OAuth 持有者令牌 |

| 选项 | 适用于 | 描述 |
|---|---|---|
| `--provider <provider>` | 全部 | 解析模型提供商的凭据 |
| `--model <model>` | 全部 | 从模型解析凭据；可与 `--provider` 组合使用 |
| `--json` | `auth check` | 将结构化结果写入 JSON |
| `--credentials` | `auth check` | 在就绪时输出解析后的凭据 |
| `--no-refresh` | `auth check` | 不刷新已过期的 OAuth 凭据；刷新为默认行为 |
| `--min-expiry <duration>` | `print-bearer-token` | 要求令牌剩余有效期，使用 `ms`、`s`、`m` 或 `h`，例如 `30m` |

凭据打印命令会将密钥写入 stdout。
