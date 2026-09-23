# 配置 shell 命令｜ Configure shell commands

Pi 会为每条 Bash 命令启动一个单独的 non-interactive shell 进程。非交互式 Bash 默认不会展开别名，并且通常不会加载与交互式终端相同的启动文件。

使用 `shellPath` 选择 Bash 可执行文件，使用 `shellCommandPrefix` 在每条命令前运行初始化设置。

## 了解 Pi 使用哪个 shell ｜ Understand which shell uses

| 命令来源 | Shell |
|---|---|
| 模型调用 built-in `bash` 工具 | Pi 解析出的 Bash 可执行文件 |
| 你输入 `!command` 或 `!!command` | 同一个解析出的 Bash 可执行文件 |
| 模型调用可选的 `powershell` 工具 | PowerShell 7 (`pwsh.exe`) 或 Windows PowerShell |
| 扩展提供或替换 shell 工具 | 该扩展实现的操作 |

Pi 通常使用 `bash -c` 调用 Bash。在 Unix 系统上，它使用 `/bin/bash`，然后在 `PATH` 上使用 `bash`，最后在 Bash 不可用时使用 `sh`。原生 Windows 首先检查配置的路径，然后检查 Git Bash ，最后在 `PATH` 上检查 `bash.exe`。

## 选择 Bash 可执行文件｜ Choose a Bash executable

当 Pi 应使用特定可执行文件时，在 `~/.pi/agent/settings.json` 中设置 `shellPath`：

```json
{
  "shellPath": "~/.local/bin/bash"
}
```

在 Windows 上，使用正斜杠或转义反斜杠：

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

更改设置后运行 `/reload`。有关原生 Windows 默认值，请参阅 [在 Windows 上运行 Pi](windows.md)。

## 在每条 Bash 命令前运行初始化设置｜ Run setup before every Bash command

设置 `shellCommandPrefix`，将 shell 初始化设置前置到 built-in `bash` 工具以及 user-entered `!` 或 `!!` 命令：

```json
{
  "shellCommandPrefix": "export CI=1"
}
```

Pi 使用换行符连接前缀和请求的命令。前缀会为每条命令重新运行，因此请保持其快速且不包含交互式提示。

## 启用 Bash 别名｜ Enable Bash aliases

将 Pi 所需的别名存储在 Bash 兼容文件中，而不是解析整个交互式 shell 配置。

创建 `~/.bash_aliases`：

```bash
alias ll='ls -la'
alias gs='git status --short'
```

然后配置 Pi 以启用别名展开并加载该文件：

```json
{
  "shellCommandPrefix": "shopt -s expand_aliases\nsource ~/.bash_aliases"
}
```

运行 `/reload`，然后通过 Pi 验证该别名：

```text
!ll
```

该命令应产生与 `ls -la` 相同的列表。

别名必须使用 Bash 兼容的语法。不要将任意的 `.zshrc` source an 到 Bash 中，因为 zsh 的选项、函数和插件在那里可能无法正确解析或运行。

## 故障排除｜ Troubleshooting

### 该前缀对 `!` 有效，但对扩展工具无效

`shellCommandPrefix` 配置 Pi 的 built-in Bash 执行。替换 `bash` 工具或提供自身 shell 操作的扩展会控制其自身的设置。请查阅该扩展的文档。

### 找不到 `shopt`

Pi 已回退到 `sh`，或者 `shellPath` 指向了非 Bash shell。请安装 Bash ，或将 `shellPath` 设置为 Bash 可执行文件，然后再使用诸如 `shopt` 之类的 Bash 专用设置。

### 设置命令等待输入

从 `shellCommandPrefix` 中移除交互式命令。该前缀会在每条 Bash 命令之前于 non-interactive 进程中运行。

有关完整的设置定义，请参阅 [Shell 设置](settings.md#shell)。
