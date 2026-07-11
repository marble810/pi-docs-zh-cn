# 终端设置

Pi uses the [Kitty keyboard protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) for reliable modifier key detection. Most modern terminals support this protocol, but some require configuration.

## Kitty、iTerm2

开箱即用。

##

Pi enables enhanced key reporting when available. If Terminal.app still sends plain Return for `Shift+Enter`, pi uses a local macOS modifier fallback to treat that Return as `Shift+Enter`.

## Ghosttyo your Ghostty config (`~/Library/Application Support/com.mitchellh.ghostty/config` on macOS, `~/.config/ghostty/config` on Linux):

```
keybind = alt+backspace=text:\x1b\x7f
```

```
keybind = shift+enter=text:\n
```

That mapping sends a raw linefeed byte. Inside pi, that is indistinguishable from `Ctrl+J`, so tmux and pi no longer see a real `shift+enter` key event.

Pi binds `Ctrl+J` as a default newline alias, so `Shift+Enter` keeps working in tmux via that remap without extra pi configuration.

## WezTermrm usually works out of the box for `Shift+Enter` via xterm modifyOtherKeys. To use the Kitty keyboard protocol explicitly, create `~/.wezterm.lua`:

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

On macOS, WezTerm binds `Option+Enter` to fullscreen by default. To use `Option+Enter` for pi follow-up queueing, add this key override:

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

If you already have a `config.keys` table, add the entry to it.

On WSL, WezTerm may require a visible hardware cursor for IME candidate window positioning. If CJK IME candidates do not follow the text cursor, set `PI_HARDWARE_CURSOR=1` before running pi or set `showHardwareCursor` to `true` in settings.

##

Alacritty usually works out of the box for `Shift+Enter`. On macOS, `Option+Enter` may arrive as plain `Enter`. To use `Option+Enter` for pi follow-up queueing, add to `~/.config/alacritty/alacritty.toml`:

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

##

VS Code 1.109.5 and newer enable Kitty keyboard protocol in the integrated terminal by default, so `Shift+Enter` should work out of the box.

VS Code versions older than 1.109.5 need an explicit terminal keybinding for `Shift+Enter`.

`keybindings.json` locations:

- macOS: `~/Library/Application Support/Code/User/keybindings.json`
- Linux: `~/.config/Code/User/keybindings.json`
- Windows: `%APPDATA%\\Code\\User\\keybindings.json`

Add to `keybindings.json`:

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

## Windows 终端

Add to `settings.json` (Ctrl+Shift+, or Settings → Open JSON file) to forward the modified Enter keys pi uses:

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

- `Shift+Enter` inserts a new line.
- Windows Terminal binds `Alt+Enter` to fullscreen by default. That prevents pi from receiving `Alt+Enter` for follow-up queueing.
- Remapping `Alt+Enter` to `sendInput` forwards the real key chord to pi instead.

If you already have an `actions` array, add the objects to it. If the old fullscreen behavior persists, fully close and reopen Windows Terminal.

## xfce4-终端、terminator

These terminals have limited escape sequence support. Modified Enter keys like `Ctrl+Enter` and `Shift+Enter` cannot be distinguished from plain `Enter`, preventing custom keybindings such as `submit: ["ctrl+enter"]` from working.

为获得最佳体验，请使用支持 Kitty 键盘协议的终端：

- [Kitty](https://sw.kovidgoyal.net/kitty/)
- [Ghostty](https://ghostty.org/)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [iTerm2](https://iterm2.com/)
- [Alacritty](https://github.com/alacritty/alacritty) (requires compilation with Kitty protocol support)

## IntelliJ IDEA （集成终端）

内置终端对转义序列的支持有限。在 IntelliJ 的终端中，无法区分 Shift+Enter 和 Enter。

If you want the hardware cursor visible, set `PI_HARDWARE_CURSOR=1` before running pi (disabled by default for compatibility).

为获得最佳体验，请考虑使用专用的终端模拟器。
