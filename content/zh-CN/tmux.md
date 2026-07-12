# tmux 设置

Pi 在 tmux 内工作，但 tmux 默认会剥离某些按键的修饰符信息。没有配置的情况下，`Shift+Enter` 和 `Ctrl+Enter` 通常与普通 `Enter` 无法区分。

## 推荐配置

添加到 `~/.tmux.conf`：

```tmux
set -g extended-keys on
set -g extended-keys-format csi-u
```

然后完全重启 tmux ：

```bash
tmux kill-server
tmux
```

Pi 在 Kitty 键盘协议不可用时自动请求扩展键报告。使用 `extended-keys-format csi-u`， tmux 以 CSI-u 格式转发修饰键，这是最可靠的配置。`extended-keys-format` 选项需要 tmux 3.5 或更高版本。

## 为什么推荐 `csi-u`

仅使用：

```tmux
set -g extended-keys on
```

tmux 默认使用 `extended-keys-format xterm`。当应用程序请求扩展键报告时，修改后的键将以 xterm `modifyOtherKeys` 格式转发，例如：

- `Ctrl+C` → `\x1b[27;5;99~`
- `Ctrl+D` → `\x1b[27;5;100~`
- `Ctrl+Enter` → `\x1b[27;5;13~`

使用 `extended-keys-format csi-u`，相同的键被转发为：

- `Ctrl+C` → `\x1b[99;5u`
- `Ctrl+D` → `\x1b[100;5u`
- `Ctrl+Enter` → `\x1b[13;5u`

Pi 支持两种格式，但 `csi-u` 是推荐的 tmux 设置。

## 此修复解决的问题

没有 tmux 扩展键时，修饰的 Enter 键退化为传统序列：

| 按键             | 无扩展键 | 使用 `csi-u` |
| ---------------- | -------- | ------------ |
| Enter            | `\r`     | `\r`         |
| Shift+Enter      | `\r`     | `\x1b[13;2u` |
| Ctrl+Enter       | `\r`     | `\x1b[13;5u` |
| Alt/Option+Enter | `\x1b\r` | `\x1b[13;3u` |

这会影响默认快捷键绑定 (`Enter` 提交，`Shift+Enter` 换行)，以及任何使用修改的 Enter 键的自定义快捷键绑定。

## 要求

- 需要 tmux 3.5 或更高版本以支持 `extended-keys-format csi-u` (运行 `tmux -V` 检查)
- 支持扩展键的终端模拟器 (Ghostty、Kitty、iTerm2、WezTerm、Windows 终端)

使用 tmux 3.2 至 3.4 时，省略 `extended-keys-format csi-u`；Pi 仍然支持 tmux 的默认 xterm `modifyOtherKeys` 格式。
