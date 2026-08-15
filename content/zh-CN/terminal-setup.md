# 终端设置｜终端 Setup

Pi 使用 [Kitty 键盘协议](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) 来可靠地检测修饰键。大多数现代终端都支持该协议，但有些终端需要进行配置。

## Kitty ｜ Kitty

开箱即用。

## iTerm2

### 常规 TUI 模式

开箱即用。

### 全屏 TUI 模式

Pi 拥有视口，因此 iTerm2 发送 mouse-wheel 报告，而不是滚动其原生回滚缓冲区。在 iTerm2 的默认 fast-trackpad 行为下，这些报告可能会丢失大部分加速滚轮增量，导致全屏滚动比常规滚动慢得多。

如果在全屏模式下，快速 mouse-wheel 手势每次只移动大约一行：

1. 打开 **iTerm2 → Settings → Advanced**。
2. 搜索 **Trackpad scrolls fast?** 并将其设置为 **No**。

这是一个 iTerm2 范围内的变通方案，也可能改变原生触控板滚动行为。底层行为在 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619) 中跟踪。

## Apple 终端｜ Apple 终端

Pi 在可用时启用增强按键报告。如果 Terminal.app 仍然为 `Shift+Enter` 发送普通回车键， pi 会使用本地 macOS 修饰键回退方案，将该回车键视为 `Shift+Enter`。

此回退方案仅在 pi 与 Terminal.app 运行在同一台 Mac 上时有效。它无法通过远程 SSH 检测本地键盘。

## Ghostty ｜ Ghostty

在 macOS 上，将以下内容添加到你的 Ghostty 配置 (`~/Library/Application Support/com.mitchellh.ghostty/config`，在 Linux 上为 `~/.config/ghostty/config`)：

```
keybind = alt+backspace=text:\x1b\x7f
```

旧版 Claude Code 可能已添加此 Ghostty 映射：

```
keybind = shift+enter=text:\n
```

该映射会发送原始换行字节。在 pi 内部，这与 `Ctrl+J` 无法区分，因此 tmux 和 pi 不再看到真正的 `shift+enter` 按键事件。

如果 Claude Code 2.x 或更高版本是你添加该映射的唯一原因，你可以将其移除，除非你想在 tmux 中使用 Claude Code ，因为它在 tmux 中仍然需要该 Ghostty 映射。

Pi 将 `Ctrl+J` 绑定为默认换行别名，因此 `Shift+Enter` 通过该重映射在 tmux 中继续工作，无需额外的 pi 配置。

### 全屏 TUI 模式

在全屏模式下，链接仍然可点击，但 Ghostty 在 pi 捕获鼠标输入时不会显示悬停下划线或 lower-left URL 预览。按住 `Shift+Command`（在 macOS 上）或 Linux 上的 `Shift+Ctrl` 可使用 Ghostty 的原生链接处理。

## WezTerm

WezTerm 通常通过 xterm modifyOtherKeys 即可开箱即用地支持 `Shift+Enter`。要显式使用 Kitty 键盘协议，请创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

在 macOS 上，WezTerm 默认将 `Option+Enter` 绑定为全屏。要使用 `Option+Enter` 进行 pi follow-up 队列操作，请添加此按键覆盖：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

如果您已有 `config.keys` 表，请将条目添加到其中。

在 WSL 上，WezTerm 可能需要可见的硬件光标来定位 IME 候选窗口。如果 CJK IME 候选未跟随文本光标，请在运行 pi 前设置 `PI_HARDWARE_CURSOR=1`，或在设置中将 `showHardwareCursor` 设为 `true`。

## Alacritty

Alacritty 通常通过 `Shift+Enter` 即可开箱即用地工作。在 macOS 上，`Option+Enter` 可能以纯 `Enter` 形式到达。要使用 `Option+Enter` 进行 pi follow-up 队列操作，请添加到 `~/.config/alacritty/alacritty.toml`：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

更改配置后重启 Alacritty。

## VS Code (集成终端)

VS Code 1.109.5 及更新版本默认在集成终端中启用 Kitty 键盘协议，因此 `Shift+Enter` 应可开箱即用。

VS Code 版本早于 1.109.5 需要为 `Shift+Enter` 显式设置终端按键绑定。

`keybindings.json` 位置：
- macOS：`~/Library/Application Support/Code/User/keybindings.json`
- Linux ：`~/.config/Code/User/keybindings.json`
- Windows ：`%APPDATA%\\Code\\User\\keybindings.json`

添加到 `keybindings.json`：

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

## Windows 终端

添加到 `settings.json`（(Ctrl+Shift+, 或设置 → 打开 JSON 文件)）以转发 pi 使用的修改后的 Enter 键：

```json
{
  "actions": [
    {
      "command": { "action": "sendInput", "input": "\u001b[13;2u" },
      "keys": "shift+enter"
    },
    {
      "command": { "action": "sendInput", "input": "\u001b[13;3u" },
      "keys": "alt+enter"
    }
  ]
}
```

- `Shift+Enter` 插入新行。
- Windows 终端 默认将 `Alt+Enter` 绑定为全屏。这会阻止 pi 接收 `Alt+Enter` 进行 follow-up 队列操作。
- 将 `Alt+Enter` 重新映射为 `sendInput` 会将真实的按键组合转发给 pi。

如果您已有 `actions` 数组，请将对象添加到其中。如果旧的全屏行为仍然存在，请完全关闭并重新打开 Windows 终端。

## xfce4-终端、terminator

这些终端对转义序列的支持有限。修改后的 Enter 键（如 `Ctrl+Enter` 和 `Shift+Enter`）无法与普通 `Enter` 区分，导致自定义键绑定（如 `submit: ["ctrl+enter"]`）无法正常工作。

为获得最佳体验，请使用支持 Kitty 键盘协议的终端：
- [Kitty](https://sw.kovidgoyal.net/kitty/)
- [Ghostty](https://ghostty.org/)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [iTerm2](https://iterm2.com/)
- [Alacritty](https://github.com/alacritty/alacritty) (需要编译时启用 Kitty 协议支持)

## IntelliJ IDEA (集成终端)

built-in 终端对转义序列的支持有限。在 IntelliJ 的终端中， Shift+Enter 无法与 Enter 区分。

如果您希望硬件光标可见，请在运行 pi 之前设置 `PI_HARDWARE_CURSOR=1` (默认禁用以保证兼容性)。

建议使用专用的终端模拟器以获得最佳体验。
