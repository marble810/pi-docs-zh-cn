# 使用 Pi

本页面收集 day-to-day 的使用细节，这些内容不适合放在快速入门页面中。

## 交互模式｜ Interactive Mode

<p align="center"><img src="images/interactive-mode.png" alt="Interactive Mode" width="600"></p>

界面有四个主要区域：

- **启动头部** - 快捷键、已加载的上下文文件、提示词模板、技能和扩展
- **消息** - 用户消息、助手响应、工具调用、工具结果、通知、错误和扩展 UI
- **编辑器** - 输入区域；边框颜色表示当前思考级别
- **页脚** - 工作目录、会话名称、令牌/缓存使用量、成本、上下文使用量和当前模型。总计包括助手响应、工具报告的使用量以及摘要生成。

编辑器可以临时被 built-in UI （如 `/settings`）或自定义扩展 UI 替换。

### 编辑器功能｜ Editor Features

| 功能 | 操作方式 |
|---------|-----|
| 文件引用 | 输入 `@` 以 fuzzy-search 项目文件 |
| 路径补全 | 按 Tab 键补全路径 |
| 多行输入 | Shift+Enter ，或在 Windows 终端 中使用 Ctrl+Enter |
| 复制响应 | Ctrl+X 复制最后一条助手消息；在 `/tree` 中，复制选中的消息 |
| 图片 | 使用 Ctrl+V 粘贴， Windows 上使用 Alt+V ，或拖入终端 |
| Shell 命令 | `!command` 运行并将输出发送给模型 |
| 隐藏的 Shell 命令 | `!!command` 运行但不将输出发送给模型 |
| 外部编辑器 | Ctrl+G 打开 `externalEditor`、`$VISUAL`、`$EDITOR`， Windows 上打开记事本，其他系统打开 `nano` |

参见 [按键绑定](keybindings.md) 了解所有快捷键和自定义设置。

## 斜杠命令

在编辑器中输入 `/` 打开命令补全。扩展可以注册自定义命令，技能可通过 `/skill:name` 使用，提示词模板通过 `/templatename` 展开。

| 命令 | 描述 |
|---------|-------------|
| `/login`、`/logout` | 管理 OAuth 或 API 密钥凭据 |
| [`/llama`](llama-cpp.md) | 下载、加载和卸载 llama.cpp 路由器模型 |
| `/model` | 切换模型 |
| `/scoped-models` | 启用/禁用模型以用于 Ctrl+P 循环切换 |
| `/settings` | 思考级别、主题、消息传递、传输 |
| `/resume` | 从之前的会话中选择 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置会话显示名称 |
| `/session` | 显示会话文件、ID、消息、令牌和成本 |
| `/tree` | 跳转到会话中的任意点并从那里继续 |
| `/trust` | 保存项目信任决策以供未来会话使用 |
| `/fork` | 从之前的用户消息创建新会话 |
| `/clone` | 将当前活动分支复制到新会话中 |
| `/compact [prompt]` | 手动压缩上下文，可选自定义指令 |
| `/copy` | 复制最后一条助手消息到剪贴板 |
| `/export [file]` | 将会话导出为 HTML 或 JSONL |
| `/import <file>` | 从 JSONL 文件导入并恢复会话 |
| `/share` | 以私有 GitHub gist 上传，并附带可分享的 HTML 链接 |
| `/reload` | 重新加载按键绑定、扩展、技能、提示词、主题和上下文文件 |
| `/hotkeys` | 显示所有键盘快捷键 |
| `/changelog` | 显示版本历史 |
| `/quit` | 退出 pi |

## 消息队列｜ Message Queue

您可以在代理仍在工作时提交消息：

- **Enter** 会排队一条引导消息，在当前助手回合完成其工具调用后传递。
- **Alt+Enter** 会排队一条 follow-up 消息，在代理完成所有工作后传递。
- **Escape** 会中止并将排队的消息恢复到编辑器中。
- **Alt+Up** 会将排队的消息取回编辑器。

在 Windows 终端 中， Alt+Enter 默认是全屏。如果您希望 pi 接收该快捷键，请按照 [终端设置](terminal-setup.md) 中的描述重新映射。

在 [设置](settings.md) 中使用 `steeringMode` 和 `followUpMode` 配置传递方式。

## 会话｜ Sessions

会话会自动保存到 `~/.pi/agent/sessions/`，并按工作目录组织。

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
- `/tree` 导航 in-file 会话树，并可总结被放弃的分支。
- `/fork` 从较早的用户消息创建新会话。
- `/clone` 将当前活动分支复制到新的会话文件中。
- `/compact` 总结较早的消息以释放上下文。

详情请参阅 [会话](sessions.md) 和 [上下文压缩](compaction.md)。

## 上下文文件｜ Context Files

Pi 在启动时从以下位置加载 `AGENTS.md` 或 `CLAUDE.md`：

- `~/.pi/agent/AGENTS.md` 用于全局指令
- 父目录，从当前工作目录向上遍历
- 当前目录

如果目录包含 `AGENTS.override.md`，Pi 会加载它而不是该目录中的 `AGENTS.md` 或 `CLAUDE.md`。来自其他目录的上下文文件仍正常分层加载。

使用上下文文件来存储项目约定、命令、安全规则和偏好设置。使用 `--no-context-files` 或 `-nc` 禁用加载。

### 系统提示词文件｜系统提示词 Files

使用以下内容替换默认系统提示词：

- `.pi/SYSTEM.md` 用于项目
- `~/.pi/agent/SYSTEM.md` 全局使用

在任一位置使用 `APPEND_SYSTEM.md` 追加到默认提示词而不替换它。

### 项目信任｜ Project Trust

在交互式启动时， pi 会在信任包含 project-local 设置、资源或项目 `.agents/skills` 的项目文件夹之前询问，且该文件夹或其父文件夹在 `~/.pi/agent/trust.json` 中没有已保存的决策。信任项目允许 pi 加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目包以及执行项目扩展。

在信任决策之前， pi 仅加载上下文文件、用户/全局扩展以及 CLI `-e` 扩展，以便它们能处理 `project_trust` 事件。项目本地扩展、项目 package-managed 扩展和项目设置仅在项目被信任后加载。此拆分也适用于切换到来自不同 cwd 的会话，且该 cwd 的信任在当前进程中尚未解决的情况。

非交互模式 (`-p`、`--mode json` 和 `--mode rpc`) 不显示信任提示。如果没有适用的已保存信任决策，它们使用全局设置中的 `defaultProjectTrust`：`ask` (默认) 和 `never` 忽略这些项目资源，而 `always` 信任它们。传递 `--approve`/`-a` 或 `--no-approve`/`-na` 以覆盖单次运行的项目信任。

如果没有扩展或已保存的决策适用，`defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中将其设置为 `"ask"`、`"always"` 或 `"never"`，或使用 `/settings` 更改它。

`pi config` 和包命令使用相同的项目信任流程，但 `pi update` 从不提示。传递 `--approve` 以信任 project-local 设置用于单个命令，或传递 `--no-approve` 以忽略它们。

在交互模式中使用 `/trust` 保存项目信任决策以供未来会话使用，包括对直接父文件夹的信任。它仅写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此请重启 pi 以使更改生效。


## 导出和共享会话｜ Exporting and Sharing Sessions

使用 `/export [file]` 将会话写入 HTML。

使用 `/share` 上传一个带有可分享 HTML 链接的私有 GitHub gist。

如果你使用 pi 进行开放 source work 研究，并希望发布会话用于模型、提示词、工具和评估研究，请参阅 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。它会将会话发布到 Hugging Face 数据集。

## CLI 参考｜ Reference

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

这些命令管理 pi 包，`pi update` 可以更新 pi CLI 安装。要卸载 pi 本身，请参阅 [快速入门](quickstart.md#uninstall)。`pi config` 和项目包命令接受 `--approve`/`--no-approve` 来信任或忽略单个命令的 project-local 设置。`pi update` 从不提示项目信任。

有关包来源和安全说明，请参阅 [Pi 包](packages.md)。

### 模式｜ Modes

| 标志 | 描述 |
|------|-------------|
| 默认 | 交互模式 |
| `-p`, `--print` | 打印响应并退出 |
| `--mode json` | 将所有事件输出为 JSON 行；参见 [JSON 模式](json.md) |
| `--mode rpc` | 通过标准输入/标准输出进行 RPC 模式；参见 [RPC 模式](rpc.md) |
| `--export <in> [out]` | 将会话导出到 HTML |

在打印模式下， pi 还会读取管道输入的标准输入，并将其合并到初始提示词中：

```bash
cat README.md | pi -p "Summarize this text"
```

### 模型选项｜ Model Options

| 选项 | 描述 |
|--------|-------------|
| `--provider <name>` | 模型提供商，例如 `anthropic`、`openai` 或 `google` |
| `--model <pattern>` | 模型模式或 ID ；支持 `provider/id` 和可选的 `:<thinking>` |
| `--api-key <key>` | API 密钥，覆盖环境变量 |
| `--thinking <level>` | `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `--models <patterns>` | 用于 Ctrl+P 循环切换的逗号分隔模式 |
| `--list-models [search]` | 列出可用模型 |

### 会话选项｜会话 Options

| 选项 | 描述 |
|--------|-------------|
| `-c`、`--continue` | 继续最近的会话 |
| `-r`、`--resume` | 浏览并选择会话 |
| `--session <path\|id>` | 使用特定的会话文件或部分 UUID |
| `--fork <path\|id>` | 将会话文件或部分 UUID 分叉到新会话 |
| `--session-dir <dir>` | 自定义会话存储目录 |
| `--no-session` | 临时模式；不保存 |
| `--name <name>`, `-n <name>` | 启动时设置会话显示名称 |

### 工具选项｜ Tool Options

| 选项 | 描述 |
|--------|-------------|
| `--tools <list>`, `-t <list>` | 允许特定的 built-in、扩展和自定义工具 |
| `--exclude-tools <list>`, `-xt <list>` | 禁用特定的 built-in、扩展和自定义工具 |
| `--no-builtin-tools`, `-nbt` | 禁用 built-in 工具，但保持扩展/自定义工具启用 |
| `--no-tools`, `-nt` | 禁用所有工具 |

内置工具：`read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`。

### 资源选项｜ Resource Options

| 选项 | 描述 |
|--------|-------------|
| `-e`, `--extension <source>` | 从路径、npm 或 git 加载扩展；可重复 |
| `--no-extensions` | 禁用扩展发现 |
| `--skill <path>` | 加载技能；可重复 |
| `--no-skills` | 禁用技能发现 |
| `--prompt-template <path>` | 加载提示词模板；可重复 |
| `--no-prompt-templates` | 禁用提示词模板发现 |
| `--theme <path>` | 加载主题；可重复 |
| `--no-themes` | 禁用主题发现 |
| `--no-context-files`, `-nc` | 禁用 `AGENTS.md` 和 `CLAUDE.md` 发现 |

将 `--no-*` 与显式标志结合使用，以精确加载所需内容，忽略设置。示例：

```bash
pi --no-extensions -e ./my-extension.ts
```

### 其他选项｜ Other Options

| 选项 | 描述 |
|--------|-------------|
| `--system-prompt <text>` | 替换默认提示词；上下文文件和技能仍会追加 |
| `--append-system-prompt <text>` | 追加到系统提示词 |
| `--tui-mode <mode>` | TUI 模式：`regular` (默认) 或实验性 `fullscreen` |
| `--use-theme <name[/name]>` | 设置本次运行的初始交互主题，不更改设置 |
| `--verbose` | 强制详细启动输出 |
| `-a`, `--approve` | 信任本次运行的 project-local 文件 |
| `-na`, `--no-approve` | 忽略本次运行的 project-local 文件 |
| `-h`, `--help` | 显示帮助 |
| `-v`, `--version` | 显示版本 |

在 `fullscreen` 模式下，转录内容在终端视口内滚动，而排队消息、工作状态、扩展组件、编辑器和页脚保持固定在底部。鼠标/触控板输入滚动指针下的区域；键盘视口操作始终可用。内联图像在支持 Kitty 图形协议的终端中工作，包括 Kitty 和 Ghostty。在 iTerm2 中，它们以文本占位符形式渲染，因为其 inline-image 协议在 application-owned 滚动期间无法删除或裁剪放置。在 `regular` 模式下， pi 使用主屏幕和 terminal-owned 回滚，iTerm2 内联图像继续正常渲染。有关 terminal-specific 设置和变通方法，请参阅 [终端设置](terminal-setup.md)。

在 `/settings` 中设置 **TUI 模式**，可在 `regular` 和 `fullscreen` 之间立即切换，并为未来会话选择默认模式。**全屏退出输出** 控制退出全屏时是打印最终转录内容，还是恢复之前的屏幕并仅打印会话恢复提示。

### 文件参数｜ File Arguments

在文件前加上 `@` 以将其包含在消息中：

```bash
pi @prompt.md "Answer this"
pi -p @screenshot.png "What's in this image?"
pi @code.ts @test.ts "Review these files"
```

### 示例｜ Examples

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

## 设计原则｜ Design Principles

Pi 保持核心小巧，并将 workflow-specific 行为推入扩展、技能、提示词模板和包中。

它有意不包含 built-in MCP、sub-agents、权限弹窗、计划模式、to-dos 或后台 bash。您可以构建或安装这些工作流作为扩展或包，或使用外部工具如容器和 tmux。

有关完整理由，请阅读 [博客文章](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)。
