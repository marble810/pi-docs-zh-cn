# 使用 Pi

本页面汇总了不适合放在快速入门页面中的日常使用细节。

## 交互模式

<p align="center"><img src="images/interactive-mode.png" alt="Interactive Mode" width="600"></p>

界面有四个主要区域：

- **Startup header** - shortcuts, loaded context files, prompt templates, skills, and extensions
- **Messages** - user messages, assistant responses, tool calls, tool results, notifications, errors, and extension UI
- **Editor** - where you type; border color indicates the current thinking level
- **Footer** - working directory, session name, token/cache usage, cost, context usage, and current model

The editor can be replaced temporarily by built-in UI such as `` or by custom extension UI.

### 编辑器功能eature | 操作方式 |

|---------|-----|
| 文件引用 | Type `@` to fuzzy-search project files |
| 路径补全 | 按 Tab 补全路径 |
| 多行输入 | Shift+Enter ，或在 Windows 终端中使用 Ctrl+Enter |
| 复制回复 | Ctrl+X copies the last assistant message; in ``, it copies the selected message |
| 图片 | 使用 Ctrl+V 粘贴， Windows 下使用 Alt+V ，或拖入终端 |
| Shell 命令 | `!command` runs and sends output to the model |
| 隐藏的 Shell 命令 | `!!command` runs without sending output to the model |
| 外部编辑器 | Ctrl+G opens `externalEditor`, `$VISUAL`, `$EDITOR`, Notepad on Windows, or `nano` elsewhere |

See [Keybindings](keybindings.md) for all shortcuts and customization.

## `/` in the editor to open command completion. Extensions can register custom commands, skills are available as `/skill:name`, and prompt templates expand via `/templatename`.

| Command | 描述
| ``|  |
| `/settings` |  |
|`` | |
| `|  |
|` | |
| ``|  |
| `/tree` |  |
|`` | 保存项目信任决策以供未来会话使用 |
| `/fork` | 从之前的用户消息创建新会话 |
| `/clone` | 将当前活动分支复制到新会话中 |
| `/compact [提示词]` | 手动压缩上下文，可选附带自定义指令 |
| `/copy` | 将最后一条助手消息复制到剪贴板 |
| `/export [文件]` | 将会话导出为 HTML 或 JSONL |
| `/import <文件>` | 从 JSONL 文件导入并恢复会话 |
| `/share` | 上传为私有 GitHub Gist ，附带可分享的 HTML 链接 |
| `/reload` | 重新加载快捷键绑定、扩展、技能、提示词、主题和上下文文件 |
| `/hotkeys` | 显示所有键盘快捷键 |
| `/changelog` | 显示版本历史 |
| `/quit` | 退出 Pi |

## 消息队列

您可以在代理仍在工作时提交消息：

- **Enter** queues a steering message, delivered after the current assistant turn finishes executing its tool calls.
- **Alt+Enter** queues a follow-up message, delivered after the agent finishes all work.
- **Escape** aborts and restores queued messages to the editor.
- **Alt+Up** retrieves queued messages back to the editor.

On Windows Terminal, Alt+Enter is fullscreen by 默认. Remap it as described in [Terminal setup](terminal-setup.md) if you want pi to receive the shortcut.

Configure delivery in [Settings](settings.md) with `steeringMode` and `followUpMode`.

## 会话

Sessions are saved automatically to `~/.pi/agent/sessions/`, organized by working directory.

```bash
pi -c                  # Continue most recent session
pi -r                  # 浏览并选择一个会话
pi --no-会话        # 临时模式；不保存
pi --name "my task"    # 启动时设置会话显示名称
pi --会话 <path|id> # Use a specific session file or session ID
pi --fork <path|id>    # Fork a session into a new session file
```

有用的会话命令：

- `/session` shows the current session file and ID.
- `/tree` navigates the in-file session tree and can summarize abandoned branches.
- `/fork` creates a new session from an earlier user message.
- `/clone` duplicates the current active branch into a new session file.
- `/compact` summarizes older messages to free context.

See [Sessions](sessions.md) and [Compaction](compaction.md) for details.

## 上下文文件

Pi loads `AGENTS.md` or `CLAUDE.md` at startup from:

- `~/.pi/agent/AGENTS.md` for global instructions
- 从当前工作目录向上遍历的父目录
- 当前目录

Use context files for project conventions, commands, safety rules, and preferences. Disable loading with `--no-context-files` or `-nc`.

### 系统提示词文件

用以下内容替换默认系统提示词：

- `.pi/SYSTEM.md` for a project
- `~/.pi/agent/SYSTEM.md` globally

Append to the default prompt without replacing it with `APPEND_SYSTEM.md` in either location.

### 项目信任

On interactive startup, pi asks before trusting a project folder that contains project-local settings, resources, or project `.agents/skills` and has no saved decision for the folder or a parent folder in `~/.pi/agent/trust.json`. Trusting a project allows pi to load `.pi/settings.json` and `.pi` resources, install missing project packages, and execute project extensions.

Before the trust decision, pi loads only context files, user/global extensions, and CLI `-e` extensions so they can handle the `project_trust` event. Project-local extensions, project package-managed extensions, and project settings are loaded only after the project is trusted. This split also applies when switching to a session from a different cwd whose trust has not been resolved in the current process.

Non-interactive modes (`-p`, `--mode json`, and `--mode rpc`) do not show a trust prompt. Without an applicable saved trust decision, they use `defaultProjectTrust` from global settings: `ask` (default) and `never` ignore those project resources, while `always` trusts them. Pass `--approve`/`-a` or `--no-approve`/`-na` to override project trust for one run.

If no extension or saved decision applies, `defaultProjectTrust` controls the fallback behavior. Set it to `"ask"`, `"always"`, or `"never"` in `~/.pi/agent/settings.json`, or change it with `/settings`.

`pi config` and package commands use the same project trust flow, except `pi update` never prompts. Pass `--approve` to trust project-local settings for one command or `--no-approve` to ignore them.

Use `/trust` in interactive mode to save a project trust decision for future sessions, including trust for the immediate parent folder. It writes `~/.pi/agent/trust.json` only; the current session is not reloaded, so restart pi for changes to take effect.

## 导出和分享会话

Use `/export [file]` to write a session to HTML.

Use `/share` to upload a private GitHub gist with a shareable HTML link.

If you use pi for open source work and want to publish sessions for model, prompt, tool, and evaluation research, see [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf). It publishes sessions to Hugging Face datasets.

## CLI 参考

```bash
pi [options] [@files...] [messages...]
```

### 包命令

```bash
pi install <source> [-l]     # Install package, -l for project-local
pi remove <source> [-l]      # Remove package
pi uninstall <source> [-l]   # Alias for remove
pi update [source|self|pi]   # Update pi only, or one package source
pi update --all              # Update pi and packages; reconcile pinned git refs
pi update --extensions       # Update packages only; reconcile pinned git refs
pi update --self             # Update pi only
pi update --extension <src>  # Update one package
pi list                      # List installed packages
pi config                    # Enable/disable package resources
```

These commands manage pi packages and `pi update` can update the pi CLI installation. To uninstall pi itself, see [Quickstart](quickstart.md#uninstall). `pi config` and project package commands accept `--approve`/`--no-approve` to trust or ignore project-local settings for one command. `pi update` never prompts for project trust.

See [Pi Packages](packages.md) for package sources and security notes.

### 模式

| 标志                  | Description                                               |
| --------------------- | --------------------------------------------------------- |
| default               | 交互模式                                                  |
| `-p`, `--print`       | 打印响应并退出                                            |
| `--mode json`         | Output all events as JSON lines; see [JSON mode](json.md) |
| `--mode rpc`          | RPC mode over stdin/stdout; see [RPC mode](rpc.md)        |
| `--export <in> [out]` | 将会话导出为 HTML                                         |

在打印模式下， pi 也会读取通过管道传入的 stdin 并将其合并到初始提示词中：

```bash
cat README.md | pi -p "Summarize this text"
```

### 模型选项tion |

|--------|-------------|
| `--模型提供商 <name>` | Provider, such as `anthropic`, `openai`, or `google` |
| `--model <pattern>` | Model pattern or ID; supports `provider/id` and optional `:<thinking>` |
| `--api-key <key>` | API 密钥，覆盖环境变量 |
| `--thinking <level>` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` |
| `--models <patterns>` | 用于 Ctrl+P 循环的逗号分隔模式 |
| `--list-models [search]` | 列出可用模型 |

### 会话选项

| Option                       | Description                         |
| ---------------------------- | ----------------------------------- |
| `-c`, `--continue`           | 继续最近的会话                      |
| `-r`, `--resume`             | Browse and select a session         |
| `--session <path\|id>`       | 使用特定的会话文件或部分 UUID       |
| `--fork <path\|id>`          | 将会话文件或部分 UUID 分支到新会话  |
| `--会话-dir <dir>`           | 自定义会话存储目录                  |
| `--no-session`               | Ephemeral mode; do not save         |
| `--name <name>`, `-n <name>` | Set session display name at startup |

### 工具选项

| Option                                 | Description                             |
| -------------------------------------- | --------------------------------------- |
| `--tools <list>`, `-t <list>`          | 允许特定的内置、扩展和自定义工具        |
| `--exclude-tools <list>`, `-xt <list>` | 禁用特定的内置、扩展和自定义工具        |
| `--no-builtin-tools`, `-nbt`           | 禁用内置工具，但保持扩展/自定义工具启用 |
| `--no-tools`, `-nt`                    | 禁用所有工具                            |

Built-in tools: `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`.

### 资源选项

| Option                       | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `-e`, `--extension <source>` | 从路径、npm 或 git 加载扩展；可重复           |
| `--no-extensions`            | 禁用扩展发现                                  |
| `--技能 <path>`              | 加载技能；可重复                              |
| `--no-skills`                | 禁用技能发现                                  |
| `--prompt-template <path>`   | 加载提示词模板；可重复                        |
| `--no-prompt-templates`      | 禁用提示词模板发现                            |
| `--theme <path>`             | 加载主题；可重复                              |
| `--no-themes`                | 禁用主题发现                                  |
| `--no-context-files`, `-nc`  | Disable `AGENTS.md` and `CLAUDE.md` discovery |

Combine `--no-*` with explicit flags to load exactly what you need, ignoring settings. Example:

```bash
pi --no-extensions -e ./my-extension.ts
```

### 其他选项

| Option                          | Description                                |
| ------------------------------- | ------------------------------------------ |
| `--system-prompt <text>`        | 替换默认提示词；上下文文件和技能仍会被追加 |
| `--append-system-prompt <text>` | 追加到系统提示词                           |
| `--verbose`                     | 强制详细输出启动信息                       |
| `-a`, `--approve`               | 本次运行信任项目本地文件                   |
| `-na`, `--no-approve`           | 本次运行忽略项目本地文件                   |
| `-h`, `--help`                  | 显示帮助信息                               |
| `-v`, `--version`               | 显示版本信息                               |

### 文件参数

Prefix files with `@` to include them in the message:

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

### 环境变量riable | Description |

|----------|-------------|
| `PI_CODING_AGENT_DIR` | Override config directory; default is `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | Override session storage directory; overridden by `--session-dir` |
| `PI_PACKAGE_DIR` | 覆盖包目录，适用于 Nix/Guix 存储路径 |
| `PI_OFFLINE` | 禁用启动时的网络操作，包括更新检查、包更新检查以及安装/更新遥测 |
| `PI_SKIP_VERSION_CHECK` | Skip the Pi version update check at startup. This prevents the `pi.dev` latest-version request |
| `PI_TELEMETRY` | Override install/update telemetry and provider attribution headers: `1`/`true`/`yes` or `0`/`false`/`no`. This does not disable update checks |
| `PI_CACHE_RETENTION` | Set to `long` for extended prompt cache where supported |
| `VISUAL`, `EDITOR` | Fallback external editor for Ctrl+G when `externalEditor` is unset; defaults to Notepad on Windows and `nano` elsewhere |

## 设计原则

Pi 保持核心小巧，将工作流特定行为推送到扩展、技能、提示词模板和包中。

它有意不包含内置的 MCP、子代理、权限弹窗、计划模式、待办事项或后台 bash。你可以将这些工作流构建或安装为扩展或包，或使用外部工具（如容器和 tmux ）。

For the full rationale, read the [blog post](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/).
