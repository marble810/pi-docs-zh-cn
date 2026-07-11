# tmux 设置

Pi works inside tmux, but tmux strips modifier information from certain keys by default. Without configuration, `Shift+Enter` and `Ctrl+Enter` are usually indistinguishable from plain `Enter`.

## 推荐配置

Add to `~/.tmux.conf`:

```tmux
set -g extended-keys on
set -g extended-keys-format csi-u
```

然后完全重启 tmux ：

```bash
tmux kill-server
tmux
```

Pi requests extended key reporting automatically when Kitty keyboard protocol is not available. With `extended-keys-format csi-u`, tmux forwards modified keys in CSI-u format, which is the most reliable configuration. The `extended-keys-format` option requires tmux 3.5 or later.

## Why `csi-u` Is Recommended

仅使用：

```tmux
set -g extended-keys on
```

tmux defaults to `extended-keys-format xterm`. When an application requests extended key reporting, modified keys are forwarded in xterm `modifyOther按键s` format such as:

- `Ctrl+C` → `\x1b[27;5;99~`
- `Ctrl+D` → `\x1b[27;5;100~`
- `Ctrl+Enter` → `\x1b[27;5;13~`

With `extended-keys-format csi-u`, the same keys are forwarded as:

- `Ctrl+C` → `\x1b[99;5u`
- `Ctrl+D` → `\x1b[100;5u`
- `Ctrl+Enter` → `\x1b[13;5u`

Pi supports both formats, but `csi-u` is the recommended tmux setup.

## 此配置解决的问题

若不启用 tmux 扩展按键，修饰过的 Enter 键会退化为旧式序列：

| Key              | 未启用扩展按键 | With `csi-u` |
| ---------------- | -------------- | ------------ |
| Enter            | `\r`           | `\r`         |
| Shift+Enter      | `\r`           | `\x1b[13;2u` |
| Ctrl+Enter       | `\r`           | `\x1b[13;5u` |
| Alt/Option+Enter | `\x1b\r`       | `\x1b[13;3u` |

This affects the default keybindings (`Enter` to submit, `Shift+Enter` for newline) and any custom keybindings using modified Enter.

## 要求

- tmux 3.5 or later for `extended-keys-format csi-u` (run `tmux -V` to check)
- 支持扩展按键的终端模拟器（ Ghostty、Kitty、iTerm2、WezTerm、Windows 终端）

With tmux 3.2 through 3.4, omit `extended-keys-format csi-u`; Pi still supports tmux's default xterm `modifyOtherKeys` format.
