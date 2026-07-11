# 按键绑定

All keyboard shortcuts can be customized via `~/.pi/agent/keybindings.json`. Each action can be bound to one or more keys.

The config file uses the same namespaced keybinding ids that pi uses internally and that extension authors use in `keyHint()` and injected `keybindings` managers.

Older configs using pre-namespaced ids such as `cursorUp` or `expandTools` are migrated automatically to the namespaced ids on start.

After editing `keybindings.json`, run `/reload` in pi to apply the changes without restarting the session.

## 按键格式

`modifier+key` where modifiers are `ctrl`, `shift`, `alt` (combinable) and keys are:

- **Letters:** `a-z`
- **Digits:** `0-9`
- **Special:** `escape`, `esc`, ``, `return`, `tab`, `space`, `退格键`, `delete`, `insert`, `clear`, `home`, `end`, ``, ``, `up`, ``, `left`, `right`
- **Function:** `f1`-`f12`
- **Symbols:** `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `_`, `+`, `|`, `~`, `{`, `}`, `:`, `<`, `>`, `?`

Modifier combinations: `hift+x`, `alt+rl+shift+alt+x`, `ctrl+1`, etc.

## 所有操作

### TUI 编辑器光标移动

| | `tui.editor.cursorWordLeft` | `alt+left`, ``alt+b`| 向左移动光标一个单词 |
|`tui.editor.cursorWordRight`|`alt+right`, `ctrl+right`, `alt+f`| 光标向右移动一个单词 |
|`tui.editor.cursorLineStart`|`home`, `到行首 |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+e` | 移动到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳转到指定字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳转到指定字符 |
| `tui.editor.pageUp` | `pageUp` | 向上翻页 |
| `tui.editor.pageDown` | `pageDown` | 向下翻页 |

### TUI 编辑器删除操作

| Keybinding id                   | Default                   | Description  |
| ------------------------------- | ------------------------- | ------------ |
| `tui.editor.deleteCharBackward` | `backspace`               | 向后删除字符 |
| `tui.editor.deleteCharForward`  | `delete`, `删除字符       |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | 向后删除单词 |
| `tui.editor.deleteWordForward`  | `alt+d`, `alt+delete`     | 向前删除单词 |
| `tui.editor.deleteToLineStart`  | ``                        | 删除至行首   |
| `tui.editor.deleteToLineEnd`    | `ctrl+k`                  | 删除至行尾   |

### TUI 输入

| Keybinding id       | Default                 | Description    |
| ------------------- | ----------------------- | -------------- |
| `tui.input.newLine` | `shift+enter`, `ctrl+j` | 插入新行       |
| `tui.input.submit`  | `enter`                 | 提交输入       |
| `tui.input.tab`     | `tab`                   | Tab / 自动补全 |

### TUI 删除环

| Keybinding id        | Default  | Description                |
| -------------------- | -------- | -------------------------- |
| `tui.editor.yank`    | `ctrl+y` | 粘贴最近删除的文本         |
| `tui.editor.yankPop` | `alt+y`  | 粘贴后循环切换已删除的文本 |
| `tui.editor.undo`    | `ctrl+-` | 撤销上一次编辑             |

### TUI 剪贴板与选择

| Keybinding id | Default            | Description |
| ------------- | ------------------ | ----------- |
| ``            | `ctrl+c            |
| ``            | `up`               |             |
| ``            | `down`             |             |
| ``            | `pageUp`           |             |
| ``            | `pageDown`         |             |
| ``            | `enter`            |             |
| ``            | `escape`, `ctrl+c` |             |

###

| Keybinding id              | Default                       | Description                                                                                               |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `app.interrupt`            | `escape`                      | 取消 / 中止                                                                                               |
| `app.clear`                | `ctrl+c`                      | 清空编辑器                                                                                                |
| `app.exit`                 | `ctrl+d`                      | 退出（当编辑器为空时）                                                                                    |
| `app.suspend`              | `ctrl+z` (none on Windows)    | 挂起到后台                                                                                                |
| `app.editor.external`      | `ctrl+g`                      | Open in external editor (`externalEditor`, `$VISUAL`, `$EDITOR`, Notepad on Windows, or `nano` elsewhere) |
| `app.clipboard.pasteImage` | `ctrl+v` (`alt+v` on Windows) | 从剪贴板粘贴图片                                                                                          |

### 会话

| Keybinding id                  | Default                        | Description                            |
| ------------------------------ | ------------------------------ | -------------------------------------- |
| `app。会话。new`               | *（无） a new session (`/new`) |
| `app。会话。tree`              | _(none)_                       | Open session tree navigator (`/tree`)  |
| `app。会话。fork`              | _(none)_                       | Fork current session (`/fork`)         |
| `app。会话。resume`            | _(none)_                       | Open session resume picker (`/resume`) |
| `app。会话。togglePath`        | `路径显示                      |
| `app。会话。toggleSort`        | `ctrl+s`                       | 切换排序模式                           |
| `app。会话。toggleNamedFilter` | `ctrl+n`                       | 切换仅显示已命名会话筛选器             |
| `app。会话。rename`            | `ctrl+r`                       | 重命名会话                             |
| `app。会话。delete`            | `ctrl+d`                       |                                        |
| ``                             | ``                             |                                        |

###

| Keybinding id | Default  | Description |
| ------------- | -------- | ----------- |
| ``            | `ctrl+l` |             |
| ``            | `ctrl+p` |             |
| ``            | ``       |             |
| ``            | `        | ``          | `   |

###

| Keybinding id | Default  | Description                                                         |
| ------------- | -------- | ------------------------------------------------------------------- |
| ``            | `        |
| ``            | `ctrl+x` | Copy the last assistant message, or the selected message in `/tree` |
| ``            | ``       |                                                                     |
| ``            | `        |

###

| Keybinding id | Default                   | Description |
| ------------- | ------------------------- | ----------- |
| ``            | `ctrl+left`, `alt+left`   |             |
| ``            | `ctrl+right`, `alt+right` |             |
| ``            | ``                        |             |
| ``            | `shift+t`                 |             |
| ``            | `ctrl+d`                  |             |
| ``            | `ctrl+t`                  |             |
| ``            | `ctrl+u`                  |             |
| ``            | `ctrl+l`                  |             |
| ``            | `ctrl+a`                  |             |
| ``            | `ctrl+o`                  |             |
| ``            | ``                        |             |

###

Used inside the scoped models selector (opened via `/scoped-models`).

| Keybinding id            | Default    | Description                  |
| ------------------------ | ---------- | ---------------------------- |
| ``                       | `ctrl+s`   |                              |
| ``                       | `ctrl+a`   |                              |
| ``                       | `ctrl+x`   |                              |
| ``                       | `ctrl+p`   |                              |
| ``                       | `alt+up`   | 将选中的模型在循环顺序中上移 |
| `app.models.reorderDown` | `alt+down` | 将选中的模型在循环顺序中下移 |

## 自定义配置

Create `~/.pi/agent/keybindings.json`:

```json
{
  "tui.editor.cursorUp": ["up", "ctrl+p"],
  "tui.editor.cursorDown": ["down", "ctrl+n"],
  "tui.editor.deleteWordBackward": ["ctrl+w", "alt+backspace"]
}
```

每个操作可以绑定单个按键或按键数组。用户配置会覆盖默认值。

On native Windows, `app.suspend` has no default binding because Windows terminals do not support Unix job control. If you bind it manually, pi shows a status message instead of suspending. In WSL, the normal Linux `ctrl+z`/`fg` behavior still applies.

### Emacs 示例

```json
{
  "tui.editor.cursorUp": ["up", "ctrl+p"],
  "tui.editor.cursorDown": ["down", "ctrl+n"],
  "tui.editor.cursorLeft": ["left", "ctrl+b"],
  "tui.editor.cursorRight": ["right", "ctrl+f"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+f"],
  "tui.editor.deleteCharForward": ["delete", "ctrl+d"],
  "tui.editor.deleteCharBackward": ["backspace", "ctrl+h"],
  "tui.input.newLine": ["shift+enter", "ctrl+j"]
}
```

### Vim 示例

```json
{
  "tui.editor.cursorUp": ["up", "alt+k"],
  "tui.editor.cursorDown": ["down", "alt+j"],
  "tui.editor.cursorLeft": ["left", "alt+h"],
  "tui.editor.cursorRight": ["right", "alt+l"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+w"]
}
```
