# 终端设置

Pi使用[Kitty 键盘协议](https://sw.kovidgoyal.net/kitty/keyboard-protocol/)实现可靠的修饰键检测。大多数现代终端支持此协议，但部分需要进行配置。

## Kitty, iTerm2

开箱即用。

## Apple 终端

Pi在可用时启用增强按键报告。如果Terminal.app仍然为`Shift+Enter`发送普通回车， pi 会使用本地的macOS修饰键回退，将该回车视为`Shift+Enter`。

此回退仅在 pi 与Terminal.app运行在同一台 Mac 上时有效。它无法通过远程SSH检测本地键盘。

## Ghostty

在你的 Ghostty 配置中添加(`~/Library/Application Support/com.mitchellh.ghostty/config`（在macOS上）或`~/.config/ghostty/config`（在 Linux 上）)：

```
keybind = alt+backspace=text:\x1b\x7f
```

较旧版本的 Claude Code 可能已添加此 Ghostty 映射：

```
keybind = shift+enter=text:\n
```

该映射发送原始换行字节。在 pi 内部，这与`Ctrl+J`无法区分，因此 tmux 和 pi 不再看到真正的`shift+enter`按键事件。

如果你添加该映射的唯一原因是 Claude Code 2.x 或更高版本，你可以删除它，除非你想在 tmux 中使用 Claude Code ，因为它仍需要该 Ghostty 映射。

Pi将`Ctrl+J`绑定为默认换行别名，因此`Shift+Enter`通过该重映射在 tmux 中继续工作，无需额外的 pi 配置。

## WezTerm

WezTerm通常通过 xterm modifyOtherKeys开箱即用地支持`Shift+Enter`。要显式使用 Kitty 键盘协议，创建`~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

在macOS上，WezTerm默认将`Option+Enter`绑定为全屏。要使用`Option+Enter`进行 pi follow-up排队，添加此按键覆盖：

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

如果你已有`config.keys`表，将条目添加到其中。

在WSL上，WezTerm可能需要可见硬件光标来定位IME候选窗口。如果CJK IME候选不跟随文本光标，在运行 pi 前设置`PI_HARDWARE_CURSOR=1`，或在设置中将`showHardwareCursor`设置为`true`。

## Alacritty

Alacritty 通常对 `Shift+Enter` 开箱即用。在 macOS 上，`Option+Enter` 可能以明文 `Enter` 形式到达。要使用 `Option+Enter` 进行 pi follow-up 排队，请添加到 `~/.config/alacritty/alacritty.toml`：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

更改配置后重启 Alacritty。

## VS Code (集成终端)

VS Code 1.109.5 及更新版本默认在集成终端中启用 Kitty 键盘协议，因此`Shift+Enter`应开箱即用。

早于 1.109.5 的 VS Code 版本需要为`Shift+Enter`显式设置终端快捷键。

`keybindings.json`位置：

- macOS: `~/Library/Application Support/Code/User/keybindings.json`
- Linux: `~/.config/Code/User/keybindings.json`
- Windows: `%APPDATA%\\Code\\User\\keybindings.json`

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

添加到 `settings.json` (Ctrl+Shift+, 或设置 → 打开 JSON 文件)，以转发 pi 使用的修改后的 Enter 键：

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

- `Shift+Enter` 插入一个新行。
- Windows 终端 默认将 `Alt+Enter` 绑定到全屏。这阻止了 pi 接收用于 follow-up 队列的 `Alt+Enter`。
- 将 `Alt+Enter` 重新映射到 `sendInput` 会将真实的按键组合转发给 pi。

如果您已经有一个 `actions` 数组，请将对象添加到其中。如果旧的全屏行为仍然存在，请完全关闭并重新打开 Windows 终端。

## xfce4-终端， terminator

这些终端对转义序列的支持有限。像 `Ctrl+Enter` 和 `Shift+Enter` 这样的修改后的 Enter 键无法与普通的 `Enter` 区分开，从而阻止了诸如 `submit: ["ctrl+enter"]` 之类的自定义按键绑定工作。

为获得最佳体验，请使用支持 Kitty 键盘协议的终端：

- [Kitty](https://sw.kovidgoyal.net/kitty/)
- [Ghostty](https://ghostty.org/)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [iTerm2](https://iterm2.com/)
- [Alacritty](https://github.com/alacritty/alacritty) (需要使用 Kitty 协议支持进行编译)

## IntelliJ IDEA (集成终端)

built-in 终端对转义序列的支持有限。在 IntelliJ 的终端中， Shift+Enter 无法与 Enter 区分。

如果您希望可见硬件光标，请在运行 pi 之前设置 `PI_HARDWARE_CURSOR=1`(默认禁用以保持兼容性)。

考虑使用专用终端模拟器以获得最佳体验。
