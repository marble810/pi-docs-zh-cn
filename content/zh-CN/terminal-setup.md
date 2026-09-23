# 配置终端｜ Configure your 终端

大多数现代终端无需额外设置即可与 Pi 配合使用。当修改键、滚动、链接、图像、颜色或 input-method 编辑器 (IME) 定位未按预期工作时，请使用此页面。

Pi 使用 extended-key 协议，以便终端能够区分 `Shift+Enter` 和 `Alt+Enter` 等组合与普通的 `Enter`。终端代理、多路复用器和 built-in IDE 终端可能会更改或丢弃该信息。

## 故障排除｜ Troubleshooting

| 症状 | 从这里开始 |
|---|---|
| `Shift+Enter` 提交而不是插入换行 | 下方您终端的对应部分；对于 tmux ，请参阅 [在 tmux 中运行 Pi](tmux.md) |
| `Alt+Enter` 不会将 follow-up 排队 | [WezTerm](#wezterm)、[Alacritty](#alacritty) 或 [Windows 终端](#windows-terminal) |
| 全屏滚动异常缓慢 | [iTerm2](#iterm2) |
| 链接可用但不显示悬停预览 | [Ghostty](#ghostty) |
| 未检测到内联图像或颜色 | [覆盖检测到的能力](#override-detected-capabilities) |
| IME 候选窗口出现在错误的位置 | [WezTerm](#wezterm) 或 [IntelliJ IDEA](#intellij-idea-integrated-terminal) |
| 修改键仅在 tmux 内失效 | [在 tmux 中运行 Pi](tmux.md) |

使用 `/hotkeys` 查看 Pi 的当前快捷键。参见 [Keybindings](keybindings.md) 进行更改。

## Kitty ｜ Kitty

Kitty 无需额外配置即可支持所需的键盘协议。

## iTerm2

常规终端模式无需额外配置即可使用。

### 修复全屏滚动缓慢｜ Fix slow fullscreen scrolling

在全屏模式下，Pi 拥有视口，因此 iTerm2 发送 mouse-wheel 报告，而不是滚动原生终端历史记录。此时快速的触控板手势每次只能移动大约一行。

要更改此行为：

1. 打开 **iTerm2 > Settings > Advanced**。
2. 搜索 **Trackpad scrolls fast?**。
3. 将其设置为 **No**。

这是一个 iTerm2 范围的设置，也可能改变原生触控板滚动。底层行为记录在 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619)。

## Apple 终端｜ Apple 终端

Pi 在可用时启用增强按键报告。如果 Terminal.app 仍为 `Shift+Enter` 发送普通 Return ，Pi 会使用本地 macOS 修饰键回退，并将其视为 `Shift+Enter`。

该回退仅在 Pi 与 Terminal.app 运行在同一台 Mac 上时有效。当 Pi 通过 SSH 在另一台机器上运行时，它无法检查本地修饰键状态。

## Ghostty ｜ Ghostty

如果 `Alt+Backspace` 不起作用，请将此映射添加到 Ghostty 的配置中：

```text
keybind = alt+backspace=text:\x1b\x7f
```

配置文件在 macOS 上为 `~/Library/Application Support/com.mitchellh.ghostty/config`，在 Linux 上为 `~/.config/ghostty/config`。

较旧的 Claude Code 配置可能包含：

```text
keybind = shift+enter=text:\n
```

这会发送原始换行符，Pi 无法将其与 `Ctrl+J` 区分开。如果添加该映射的唯一原因是较旧的 Claude Code 安装，请移除该映射。Pi 已将 `Ctrl+J` 绑定为换行替代方案，因此该映射可能看起来有效，但仍会阻止 Pi 和 tmux 接收真正的 `Shift+Enter` 事件。

### 在全屏模式下打开链接｜ Open links in fullscreen mode

在全屏模式下链接仍可点击，但当 Pi 捕获鼠标输入时， Ghostty 不会显示其正常的悬停下划线或 URL 预览。在 macOS 上按住 `Shift+Command`，或在 Linux 上按住 `Shift+Ctrl`，以使用 Ghostty 的原生链接处理。

## WezTerm

WezTerm 通常通过 xterm 扩展键报告 `Shift+Enter`。要显式启用 Kitty 键盘协议，请创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

### 在 macOS 上转发 Alt+Enter ｜ Forward Alt+Enter on macOS

WezTerm 在 macOS 上默认将 `Option+Enter` 绑定到全屏。要将其用于 Pi 的 follow-up 队列，请将以下条目添加到你的 `config.keys` 表中：

```lua
{
  key = 'Enter',
  mods = 'ALT',
  action = wezterm.action.SendString('\x1b[13;3u'),
}
```

完整的极简配置为：

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

### 在 WSL 中定位 IME 候选窗口｜ Position an IME candidate window in WSL

如果 CJK IME 候选窗口在 WSL 中不跟随 Pi 的文本光标，请显示硬件光标：

```bash
export PI_HARDWARE_CURSOR=1
pi
```

你也可以在 Pi 设置中将 `showHardwareCursor` 设置为 `true`。

## Alacritty ｜ Alacritty

Alacritty 通常报告 `Shift+Enter`。在 macOS 上，`Option+Enter` 可能以普通 `Enter` 形式到达。将以下内容添加到 `~/.config/alacritty/alacritty.toml` 以将其转发到 Pi：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

更改文件后重启 Alacritty。

## VS Code 集成终端｜ VS Code integrated 终端

VS Code 1.109.5 及更新版本默认在集成终端中启用 Kitty 键盘协议。

对于较旧版本，请将 `Shift+Enter` 终端绑定添加到 `keybindings.json`：

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

用户 `keybindings.json` 文件通常位于：

- macOS：`~/Library/Application Support/Code/User/keybindings.json`
- Linux ：`~/.config/Code/User/keybindings.json`
- Windows ：`%APPDATA%\\Code\\User\\keybindings.json`

## Zed 集成终端｜ Zed integrated 终端

将这些绑定添加到 Zed 的 `keymap.json`：

```json
{
  "context": "Terminal",
  "bindings": {
    "shift-enter": ["terminal::SendText", "\u001b[13;2u"],
    "ctrl--": ["terminal::SendText", "\u001b[45;5u"],
    "ctrl-alt-]": ["terminal::SendText", "\u001b[93;7u"]
  }
}
```

## Windows 终端｜ Windows 终端

Windows 终端 使用 Pi 的 Windows 和 WSL 快捷键默认值。完整列表请参见 [Keybindings](keybindings.md)。

### 转发 Shift+Enter

使用 `Ctrl+Shift+,` 打开 Windows 终端 的 `settings.json`，或通过 **Settings > Open JSON file**。将以下对象添加到其 `actions` 数组中：

```json
{
  "command": { "action": "sendInput", "input": "\u001b[13;2u" },
  "keys": "shift+enter"
}
```

完全关闭并重新打开 Windows 终端，然后验证 `Shift+Enter` 是否在 Pi 中插入新行。

### 使用 Alt+Enter 进行 follow-ups

Windows 终端 默认将 `Alt+Enter` 绑定为全屏。因此 Pi 在 Windows 和 WSL 上使用 `Ctrl+Q` 进行 follow-ups。

若要改用 `Alt+Enter`，请配置 Windows 终端 转发该按键，并在 Pi 的 `keybindings.json` 中将 `app.message.followUp` 绑定到 `alt+enter`。参见 [Keybindings](keybindings.md#assign-keybindings)。

## xfce4-终端 和 Terminator

这些终端无法可靠地区分带修饰键的 Enter 键与普通 `Enter`。因此，诸如 `Ctrl+Enter` 或 `Shift+Enter` 之类的自定义绑定可能无法生效。

当你需要这些快捷键时，请使用支持现代 extended-key 的终端，例如 Kitty、Ghostty、WezTerm、iTerm2、Windows 终端 或兼容的 Alacritty 构建版本。

## IntelliJ IDEA 集成终端

IntelliJ IDEA 的 built-in 终端无法可靠地区分 `Shift+Enter` 与普通 `Enter`。请使用 `Ctrl+J` 换行，或在支持现代 extended-key 的终端中运行 Pi。

如果 IME 候选窗口不跟随文本光标，请显示硬件光标：

```bash
export PI_HARDWARE_CURSOR=1
pi
```

## 覆盖检测到的能力

Pi 会自动检测 OSC 8 超链接、内联图像协议和真彩色支持。终端代理或多路复用器可能导致该检测不准确。

| 能力 | 环境变量 | 设置 |
|---|---|---|
| 超链接 | `PI_HYPERLINKS=1\|0\|auto` | `terminal.hyperlinks: true\|false\|"auto"` |
| 内联图像 | `PI_IMAGE_PROTOCOL=kitty\|iterm2\|none\|auto` | `terminal.images: "kitty"\|"iterm2"\|false\|"auto"` |
| 真彩色 | `PI_TRUE_COLOR=1\|0\|auto` | `terminal.trueColor: true\|false\|"auto"` |

设置优先于环境变量。未设置的值或 `auto` 会保留自动检测。

仅强制使用完整终端路径所支持的能力。不支持的转义序列可能会破坏渲染。有关规范值定义，请参阅 [Environment Variables](environment-variables.md#pi-process-configuration) 和 [Settings](settings.md)。
