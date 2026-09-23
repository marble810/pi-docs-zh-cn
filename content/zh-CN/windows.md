# 在 Windows 上运行 Pi｜ Run on Windows

将 Pi 作为原生 Windows 进程运行，或在 Windows Subsystem for Linux (WSL) 中运行。原生 Windows 默认使用 Git Bash 执行 Bash 命令，并可以选择向模型暴露 PowerShell。WSL 中的 Pi 使用 Linux 环境及其 Bash 安装。

按照主 [Quickstart](quickstart.md) 安装并验证 Pi。使用本页选择并配置其命令环境。

## 选择原生 Windows 或 WSL｜ Choose native Windows or 

| 环境 | 命令环境 | 使用场景 |
|---|---|---|
| 使用 Git Bash 的原生 Windows | 用于 built-in `bash` 工具和 `!` 命令的 Git Bash | 你的文件和开发工具主要位于 Windows 上 |
| 使用 `powershell` 工具的原生 Windows | PowerShell 用于模型工具调用； Bash 仍可用于 `!` 命令 | 任务依赖于 PowerShell 模块或 Windows 原生命令 |
| WSL | 所选 WSL 发行版内的 Linux Bash 和工具 | 你的文件和工具链已经位于 Linux 或 WSL 中 |

## 在原生 Windows 上使用 Git Bash

对于大多数原生 Windows 用户，安装 [Git for Windows](https://git-scm.com/download/win) 就足够了。

Pi 按以下顺序解析 Bash ：

1. 来自 `~/.pi/agent/settings.json` 的 `shellPath`
2. `Program Files` 或 `Program Files (x86)` 下的 Git Bash
3. `PATH` 上的 `bash.exe`，包括 Cygwin、MSYS2 或旧版 WSL Bash

启动 Pi 并输入此命令以验证 shell ：

```text
!printf 'Bash is working\n'
```

如果 Pi 无法 find Bash，它会报告检查过的位置。安装 Git for Windows ，将另一个 Bash 可执行文件放到 `PATH` 上，或配置 `shellPath`。

## 让模型使用 PowerShell

可选的 `powershell` 工具在可用时通过 `pwsh.exe` 运行命令，然后回退到 Windows PowerShell。它使用 `-NoProfile -NonInteractive -ExecutionPolicy Bypass` 启动 PowerShell。管理员强制执行的执行策略仍可优先。

要将 model-facing `bash` 工具替换为 `powershell`，请将以下内容添加到 `~/.pi/agent/settings.json`：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

重启 Pi，然后让它运行一个无害的 PowerShell 命令。`!` 和 `!!` 编辑器命令继续使用 Bash。`powershell` 工具仅在 Pi 作为原生 Windows 进程运行时可用。

有关其他工具组合，请参阅 [Settings](settings.md#tools)。

## 使用自定义 Bash 可执行文件

当 Bash 安装在 Pi 无法自动发现的位置时，设置 `shellPath`：

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

JSON 使用反斜杠表示转义序列。当你编写带反斜杠的 Windows 路径时，每个反斜杠都要写两次，如上所示。

有关命令前缀、别名以及完整的 shell-resolution 行为，请参阅 [Configure shell commands](shell-aliases.md)。

## 配置 Windows 终端｜ Configure Windows 终端

Windows 终端 会保留或重写某些带修饰键的按键。请参阅 [Windows 终端](terminal-setup.md#windows-terminal) 来配置 `Shift+Enter` 和 `Alt+Enter`，并参阅 [Keybindings](keybindings.md) 了解 Pi 的 Windows 和 WSL 快捷键默认值。
