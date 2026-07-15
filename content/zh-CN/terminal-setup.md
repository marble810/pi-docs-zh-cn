# 终端设置｜Terminal Setup

Pi 使用 [Kitty 键盘协议](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) 实现可靠的修饰键检测。大多数现代终端支持该协议，但部分终端需要配置。

## Kitty, iTerm2

开箱即用。

## Apple 终端

Pi 在可用时启用增强按键报告。如果 Terminal.app 仍为 `Shift+Enter` 发送普通回车键， pi 使用本地 macOS 修饰键回退机制将该回车视为 `Shift+Enter`。

此回退机制仅在 pi 与 Terminal.app 运行于同一 Mac 上时生效。无法通过远程 SSH 检测本地键盘。

## Ghostty

在 macOS 上，将以下内容添加到 Ghostty 配置文件 (`~/Library/Application Support/com.mitchellh.ghostty/config`（ Linux 上为 `~/.config/ghostty/config`）)：

```
keybind = alt+backspace=text:\x1b\x7f
```

较旧的 Claude Code 版本可能已添加此 Ghostty 映射：

```
keybind = shift+enter=text:\n
```

该映射会发送原始换行字节。在 pi 内部，这与 `Ctrl+J` 无法区分，因此 tmux 和 pi 不再能识别真正的 `shift+enter` 按键事件。

如果添加该映射的唯一原因是 Claude Code 2.x 或更新版本，则可以将其移除，除非您希望在 tmux 中使用 Claude Code （ tmux 仍需该 Ghostty 映射）。

Pi 将 `Ctrl+J` 绑定为默认换行别名，因此 `Shift+Enter` 通过该重映射在 tmux 中仍能正常工作，无需额外配置 pi。

## WezTerm

WezTerm 通常通过 xterm modifyOtherKeys 对 `Shift+Enter` 开箱即用。要显式使用 Kitty 键盘协议，请创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

在 macOS 上，WezTerm 默认将 `Option+Enter` 绑定为全屏功能。要使用 `Option+Enter` 进行 pi follow-up 队列操作，请添加以下按键覆写：

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

如果已存在 `config.keys` 表，请将条目添加到该表中。

在 WSL 上，WezTerm 可能需要可见的硬件光标来定位 IME 候选窗口。如果 CJK IME 候选不跟随文本光标，请在运行 pi 前设置 `PI_HARDWARE_CURSOR=1`，或在设置中将 `showHardwareCursor` 设为 `true`。

## Alacritty

Alacritty 通常开箱即用，适用于 `Shift+Enter`。在 macOS 上，`Option+Enter` 可能以纯 `Enter` 形式出现。要使用 `Option+Enter` 进行 pi follow-up 排队，请添加到 `~/.config/alacritty/alacritty.toml`：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

更改配置后重启 Alacritty。

## VS Code (集成终端)

VS Code 1.109.5 及更新版本默认在集成终端中启用 Kitty 键盘协议，因此 `Shift+Enter` 应开箱即用。

版本低于 1.109.5 的 VS Code 需要为 `Shift+Enter` 显式设置终端按键绑定。

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

添加到 `settings.json` (Ctrl+Shift+, 或设置 → 打开 JSON 文件)，以转发 pi 使用的修改版 Enter 键：

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
- Windows 终端 默认将 `Alt+Enter` 绑定为全屏。这会阻止 pi 接收 `Alt+Enter` 以进行 follow-up 排队。
- 将 `Alt+Enter` 重新映射到 `sendInput` 可向 pi 转发真实的键组合。

如果您已有 `actions` 数组，请将对象添加到其中。如果旧的全屏行为仍然存在，请完全关闭并重新打开 Windows 终端。

## xfce4-终端， terminator

这些终端支持的转义序列有限。修改后的 Enter 键（如 `Ctrl+Enter` 和 `Shift+Enter`）无法与纯 `Enter` 区分，因此无法使用自定义按键绑定（如 `submit: ["ctrl+enter"]`）。

为获得最佳体验，请使用支持 Kitty 键盘协议的终端：
- [Kitty](https://sw.kovidgoyal.net/kitty/)
- [Ghostty](https://ghostty.org/)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [iTerm2](https://iterm2.com/)
- [Alacritty](https://github.com/alacritty/alacritty) (需要使用 Kitty 协议支持编译)

## IntelliJ IDEA (集成终端)

built-in 终端对转义序列的支持有限。在 IntelliJ 的终端中， Shift+Enter 无法与 Enter 区分。

如果需要显示硬件光标，请在运行 pi 之前设置 `PI_HARDWARE_CURSOR=1`（(默认禁用以保证兼容性)）。

建议使用专用的终端模拟器以获得最佳体验。
