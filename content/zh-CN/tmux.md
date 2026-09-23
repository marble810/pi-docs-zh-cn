# 在 tmux 中运行 Pi｜ Run in tmux

Pi 可在 tmux 中运行，但 tmux 可能会将 `Shift+Enter`、`Ctrl+Enter` 和普通的 `Enter` 报告为同一个按键。启用扩展按键，以便 Pi 能够区分它们。

## 检查你的 tmux 版本｜ Check your tmux version

```bash
tmux -V
```

对于 tmux 3.5 或更高版本，请使用下面推荐的 CSI-u 配置。对于 tmux 3.2 到 3.4 ，请使用 older-version 配置。

## 在 tmux 3.5 或更高版本中启用扩展按键｜ Enable extended keys in tmux 3.5 or newer

将以下行添加到 `~/.tmux.conf`：

```tmux
set -g extended-keys on
set -g extended-keys-format csi-u
```

当终端不直接提供 Kitty 键盘协议时，Pi 会请求 extended-key 报告。CSI-u 是通过 tmux 转发修改按键的最可靠格式。

## 重启 tmux ｜ Restart tmux

该配置应用于 tmux 服务器。为确保其生效，请关闭你的 tmux 会话并启动一个新的服务器。

如果你选择从命令行停止服务器，请先保存你的工作。此命令会终止该服务器管理的每个会话：

```bash
tmux kill-server
tmux
```

## 验证修改后的按键｜ Verify modified keys

在新的 tmux 会话中启动 Pi，并检查：

1. `Shift+Enter` 在编辑器中插入新行。
2. `Enter` 提交提示词。
3. `Alt+Enter` 在 macOS 和 Linux 上排队一个 follow-up。Windows 和 WSL 默认使用 `Ctrl+Q`。

如果这些按键的行为仍然像普通的 `Enter`，请验证 tmux 外部的终端能否报告修改后的按键。参见 [配置你的终端](terminal-setup.md)。

## 使用 tmux 3.2 到 3.4 ｜ Use tmux 3.2 through 3.4

这些版本支持扩展按键，但不支持 `extended-keys-format csi-u`。仅添加：

```tmux
set -g extended-keys on
```

Pi 支持这些版本使用的 xterm `modifyOtherKeys` 格式。重启 tmux 并重复验证步骤。

对于较旧的版本，请升级 tmux ，或在 tmux 外部使用 Pi，而不是依赖修改后的 Enter 快捷键。
