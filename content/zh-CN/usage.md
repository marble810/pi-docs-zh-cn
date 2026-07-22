# 使用 Pi

本页面汇总了 day-to-day 在快速入门页面中未涉及的用法细节。

## 交互模式｜ Interactive Mode

<p align="center"><img src="images/interactive-mode.png" alt="Interactive Mode" width="600"></p>

界面包含四个主要区域：

- **启动头部** - 快捷键、已加载的上下文文件、提示词模板、技能和扩展
- **消息** - 用户消息、助手回复、工具调用、工具结果、通知、错误和扩展 UI
- **编辑器** - 输入区域；边框颜色表示当前思考级别
- **页脚** - 工作目录、会话名称、令牌/缓存用量、费用、上下文使用情况和当前模型。总计包括助手回复、工具报告的使用量和摘要生成。

编辑器可以临时被 built-in UI （如 `/settings`）或自定义扩展 UI 替换。

### 编辑器功能｜ Editor Features

| 功能 | 操作方式 |
|---------|-----|
| 文件引用 | 输入 `@` 以fuzzy-search项目文件 |
| 路径补全 | 按 Tab 键补全路径 |
| 多行输入 | Shift+Enter ，或在 Windows 终端中使用 Ctrl+Enter |
| 复制回复 | Ctrl+X 复制最后一条助手消息；在 `/tree` 中，复制选中的消息 |
| 图片 | 在 Windows 上使用 Ctrl+V、Alt+V 粘贴，或拖入终端 |
| Shell 命令 | `!command` 执行并将输出发送给模型 |
| 隐藏的 Shell 命令 | `!!command` 执行但不将输出发送给模型 |
| 外部编辑器 | Ctrl+G 在 Windows 上打开 `externalEditor`、`$VISUAL`、`$EDITOR`、记事本，在其他系统上打开 `nano` |

查看 [快捷键](keybindings.md) 以了解所有快捷键及自定义设置。

## 斜杠命令

在编辑器中输入 `/` 打开命令补全。扩展可以注册自定义命令，技能以 `/skill:name` 形式提供，提示词模板通过 `/templatename` 展开。

| 命令 | 描述 |
|---------|-------------|
| `/login`、`/logout` | 管理 OAuth 或API密钥凭据 |
| [`/llama`](llama-cpp.md) | 下载、加载和卸载llama.cpp路由器模型 |
| `/model` | 切换模型 |
| `/scoped-models` | 启用/禁用模型以用于 Ctrl+P 循环切换 |
| `/settings` | 思考级别、主题、消息投递、传输 |
| `/resume` | 从之前的会话中选择 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置会话显示名称 |
| `/session` | 显示会话文件、ID、消息、令牌和成本 |
| `/tree` | 跳转到会话中的任意点并从那里继续 |
| `/trust` | 保存项目信任决策以供未来会话使用 |
| `/fork` | 根据之前的用户消息创建新会话 |
| `/clone` | 将当前活动分支复制到新会话中 |
| `/compact [prompt]` | 手动压缩上下文，可选择使用自定义指令 |
| `/copy` | 将最后一条助手消息复制到剪贴板 |
| `/export [file]` | 将会话导出为 HTML 或 JSONL |
| `/import <file>` | 从 JSONL 文件导入并恢复会话 |
| `/share` | 上传为私有 GitHub gist ，并附带可分享的 HTML 链接 |
| `/reload` | 重新加载按键绑定、扩展、技能、提示词、主题和上下文文件 |
| `/hotkeys` | 显示所有键盘快捷键 |
| `/changelog` | 显示版本历史 |
| `/quit` | 退出 pi |

## 消息队列｜ Message Queue

你可以在代理仍在工作时提交消息：

- **Enter** 将一条引导消息排队，在当前助手轮次完成其工具调用后投递。
- **Alt+Enter** 将一条 follow-up 消息排队，在代理完成所有工作后投递。
- **Escape** 中止并恢复排队的消息到编辑器中。
- **Alt+Up** 将排队的消息取回编辑器。

在 Windows 终端 上， Alt+Enter 默认是全屏。如果你想 pi 接收该快捷键，请按照 [终端 setup](terminal-setup.md) 中的描述重新映射。

在 [Settings](settings.md) 中通过 `steeringMode` 和 `followUpMode` 配置投递行为。

## 会话｜ Sessions

会话自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse and select a session
pi --no-session        # Ephemeral mode; do not save
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Use a specific session file or session ID
pi --fork <path|id>    # Fork a session into a new session file
```

有用的会话命令：

- `/session` 显示当前会话文件和 ID。
- `/tree` 浏览 in-file 会话树，并可总结已废弃的分支。
- `/fork` 根据较早的用户消息创建新会话。
- `/clone` 将当前活动分支复制到一个新的会话文件中。
- `/compact` 对较旧的消息进行摘要以释放上下文。

有关详细信息，请参阅 [会话](sessions.md)和[上下文压缩](compaction.md)。

## 上下文文件｜ Context Files

Pi 在启动时从以下位置加载 `AGENTS.md` 或 `CLAUDE.md`：

- `~/.pi/agent/AGENTS.md` 用于全局指令
- 父目录（从当前工作目录向上遍历）
- 当前目录

使用上下文文件存放项目约定、命令、安全规则和偏好设置。通过 `--no-context-files` 或 `-nc` 禁用加载。

### 系统提示词文件｜系统提示词 Files

将默认系统提示词替换为：

- `.pi/SYSTEM.md` 用于项目
- `~/.pi/agent/SYSTEM.md` 全局

在默认提示词后追加内容，而不使用 `APPEND_SYSTEM.md` 替换它（无论哪个位置）。

### 项目信任｜ Project Trust

在交互式启动时，如果项目文件夹包含 project-local 设置、资源或项目 `.agents/skills`，且 `~/.pi/agent/trust.json` 中未保存对该文件夹或其父文件夹的信任决策， pi 会在信任前询问。信任项目后， pi 可以加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目包以及执行项目扩展。

在信任决策之前， pi 仅加载上下文文件、用户/全局扩展以及 CLI `-e` 扩展，以便它们可以处理 `project_trust` 事件。项目本地扩展、项目 package-managed 扩展和项目设置仅在项目被信任后才加载。当从当前进程中尚未解决信任问题的不同工作目录切换到会话时，此分离同样适用。

非交互模式 (`-p`、`--mode json` 和 `--mode rpc`) 不会显示信任提示。如果没有适用的已保存信任决策，它们将使用全局设置中的 `defaultProjectTrust`：`ask` (default) 和 `never` 忽略这些项目资源，而 `always` 信任它们。传递 `--approve`/`-a` 或 `--no-approve`/`-na` 以在一次运行中覆盖项目信任。

如果没有扩展或已保存的决策适用，`defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中将其设置为 `"ask"`、`"always"` 或 `"never"`，或使用 `/settings` 更改它。

`pi config` 和包命令使用相同的项目信任流程，但 `pi update` 从不提示。传递 `--approve` 以信任单个命令的 project-local 设置，或传递 `--no-approve` 以忽略它们。

在交互模式下使用 `/trust` 保存项目信任决策以供未来会话使用，包括对直接父文件夹的信任。它仅写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此请重启 pi 以使更改生效。


## 导出与分享会话｜ Exporting and Sharing Sessions

使用 `/export [file]` 将会话写入 HTML。

使用 `/share` 上传包含可分享 HTML 链接的私有 GitHub Gist。

如果您将 pi 用于开放 source work 并希望发布会话以用于模型、提示词、工具和评估研究，请参阅 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。它将会话发布到 Hugging Face 数据集。

## CLI 参考

```bash
pi [options] [@files...] [messages...]
```

### 包命令｜ Package Commands

```bash
pi install <source> [-l]     # Install package, -l for project-local
pi remove <source> [-l]      # Remove package
pi uninstall <source> [-l]   # Alias for remove
pi update [source|self|pi]   # Update pi only, or one package source
pi update --all              # Update pi and packages; reconcile pinned git refs
pi update --extensions       # Update packages only; reconcile pinned git refs
pi update --models           # Refresh model catalogs only
pi update --self             # Update pi only
pi update --extension <src>  # Update one package
pi list                      # List installed packages
pi config                    # Enable/disable package resources
```

这些命令管理 pi 包，`pi update` 可以更新 pi CLI 安装。要卸载 pi 本身，请参阅 [快速入门](quickstart.md#uninstall)。`pi config` 和项目包命令接受 `--approve`/`--no-approve` 来信任或忽略单条命令的 project-local 设置。`pi update` 从不提示项目信任。

请参阅 [Pi 包](packages.md) 了解包来源和安全注意事项。

### 模式｜ Modes

| 标志 | 描述 |
|------|-------------|
| 默认 | 交互模式 |
| `-p`, `--print` | 打印响应并退出 |
| `--mode json` | 将所有事件输出为 JSON 行；请参阅 [JSON 模式](json.md) |
| `--mode rpc` | 通过 stdin/stdout 使用 RPC 模式；请参阅 [RPC 模式](rpc.md) |
| `--export <in> [out]` | 将会话导出到 HTML |

在打印模式下， pi 还会读取通过管道传入的 stdin 并将其合并到初始提示中：

```bash
cat README.md | pi -p "Summarize this text"
```

### 模型选项｜ Model Options

| 选项 | 描述 |
|--------|-------------|
| `--provider <name>` | 模型提供商，例如 `anthropic`、`openai` 或 `google` |
| `--model <pattern>` | 模型模式或 ID ；支持 `provider/id` 和可选的 `:<thinking>` |
| `--api-key <key>` | API 密钥，覆盖环境变量 |
| `--thinking <level>` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` |
| `--models <patterns>` | 用于 Ctrl+P 循环切换的逗号分隔模式 |
| `--list-models [search]` | 列出可用模型 |

### 会话选项｜会话 Options

| 选项｜ Option | 描述｜ Description |
|--------|-------------|
| `-c`, `--continue` | 继续最近的会话 |
| `-r`, `--resume` | 浏览并选择一个会话 |
| `--session <path\|id>` | 使用特定的会话文件或部分 UUID |
| `--fork <path\|id>` | 将会话文件或部分 UUID 派生到一个新会话中 |
| `--session-dir <dir>` | 自定义会话存储目录 |
| `--no-session` | 临时模式；不保存 |
| `--name <name>`, `-n <name>` | 在启动时设置会话显示名称 |

### 工具选项｜ Tool Options

| 选项 | 描述 |
|--------|-------------|
| `--tools <list>`, `-t <list>` | 允许特定的built-in、扩展和自定义工具 |
| `--exclude-tools <list>`, `-xt <list>` | 禁用特定的built-in、扩展和自定义工具 |
| `--no-builtin-tools`, `-nbt` | 禁用built-in工具，但保持扩展/自定义工具启用 |
| `--no-tools`, `-nt` | 禁用所有工具 |

内置工具：`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`。

### 资源选项｜ Resource Options

| 选项 | 描述 |
|--------|-------------|
| `-e`, `--extension <source>` | 从路径、npm 或 git 加载扩展；可重复使用 |
| `--no-extensions` | 禁用扩展发现 |
| `--skill <path>` | 加载技能；可重复使用 |
| `--no-skills` | 禁用技能发现 |
| `--prompt-template <path>` | 加载提示词模板；可重复 |
| `--no-prompt-templates` | 禁用提示词模板发现 |
| `--theme <path>` | 加载主题；可重复 |
| `--no-themes` | 禁用主题发现 |
| `--no-context-files`, `-nc` | 禁用 `AGENTS.md` 和 `CLAUDE.md` 发现 |

将 `--no-*` 与显式标志结合，仅加载所需内容，忽略设置。示例：

```bash
pi --no-extensions -e ./my-extension.ts
```

### 其他选项

| 选项 | 描述 |
|--------|-------------|
| `--system-prompt <text>` | 替换默认提示词；上下文文件和技能仍会附加 |
| `--append-system-prompt <text>` | 附加到系统提示词 |
| `--verbose` | 强制详细启动 |
| `-a`, `--approve` | 本次运行信任 project-local 文件 |
| `-na`, `--no-approve` | 本次运行忽略 project-local 文件 |
| `-h`、`--help` | 显示帮助 |
| `-v`、`--version` | 显示版本 |

### 文件参数

使用 `@` 作为文件前缀以将其包含在消息中：

```bash
pi @prompt.md "Answer this"
pi -p @screenshot.png "What's in this image?"
pi @code.ts @test.ts "Review these files"
```

### 示例

```bash
# Interactive with initial prompt
pi "List all .ts files in src/"

# Non-interactive
pi -p "Summarize this codebase"

# Non-interactive with piped stdin
cat README.md | pi -p "Summarize this text"

# Named one-shot session
pi --name "release audit" -p "Audit this repository"

# Different model
pi --provider openai --model gpt-4o "Help me refactor"

# Model with provider prefix
pi --model openai/gpt-4o "Help me refactor"

# Model with thinking level shorthand
pi --model sonnet:high "Solve this complex problem"

# Limit model cycling
pi --models "claude-*,gpt-4o"

# Read-only mode
pi --tools read,grep,find,ls -p "Review the code"

# Disable one extension or built-in tool while keeping the rest available
pi --exclude-tools ask_question
```

### 环境变量

| 变量 | 描述 |
|----------|-------------|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录；默认为 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储目录；被 `--session-dir` 覆盖 |
| `PI_PACKAGE_DIR` | 覆盖包目录，适用于 Nix/Guix 存储路径 |
| `PI_OFFLINE` | 禁用启动时的网络操作，包括更新检查、包更新检查以及安装/更新遥测 |
| `PI_SKIP_VERSION_CHECK` | 跳过启动时的 Pi 版本更新检查。这将阻止 `pi.dev` latest-version 请求 |
| `PI_TELEMETRY` | 覆盖安装/更新遥测和提供商归属标头：`1`/`true`/`yes` 或 `0`/`false`/`no`。这不会禁用更新检查 |
| `PI_CACHE_RETENTION` | 在支持的情况下，设置为 `long` 以启用扩展提示词缓存。 |
| `VISUAL`, `EDITOR` | 当 `externalEditor` 未设置时， Ctrl+G 的备用外部编辑器； Windows 上默认使用记事本，其他平台默认使用 `nano`。 |

## 设计原则｜ Design Principles

Pi 保持核心小巧，并将 workflow-specific 行为推送到扩展、技能、提示词模板和包中。

它故意不包含 built-in MCP、sub-agents、权限弹窗、计划模式、to-dos 或后台 bash。你可以将这些工作流构建或安装为扩展或包，或使用外部工具如容器和 tmux。

如需完整理由，请阅读[博客文章](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)。
