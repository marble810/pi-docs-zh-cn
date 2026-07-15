# 快捷键｜Keybindings

所有键盘快捷键都可通过 `~/.pi/agent/keybindings.json` 自定义。每个动作可绑定到一个或多个按键。

配置文件使用与 Pi 内部及扩展作者在 `keyHint()` 和注入的 `keybindings` 管理器中使用相同的命名空间快捷键绑定 ID。

使用 pre-namespaced ID （例如 `cursorUp` 或 `expandTools`）的旧配置在启动时会自动迁移到命名空间 ID。

编辑 `keybindings.json` 后，在 Pi 中运行 `/reload` 可应用更改而无需重启会话。

## 按键格式

`modifier+key` 其中修饰键为 `ctrl`、`shift`、`alt` (可组合)，按键为：

- **字母：** `a-z`
- **数字：** `0-9`
- **特殊键：** `escape`、`esc`、`enter`、`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right`
- **功能键：** `f1`-`f12`
- **符号键：** `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `_`, `+`, `|`, `~`, `{`, `}`, `:`, `<`, `>`, `?`

修饰键组合：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`ctrl+1` 等。

## 所有动作

### TUI TUI 编辑器光标移动

| 快捷键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.editor.cursorUp` | `up` | 向上移动光标 |
| `tui.editor.cursorDown` | `down` | 向下移动光标 |
| `tui.editor.cursorLeft` | `left`, `ctrl+b` | 向左移动光标 |
| `tui.editor.cursorRight` | `right`, `ctrl+f` | 向右移动光标 |
| `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | 向左移动一个单词光标 |
| `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | 向右移动一个单词光标 |
| `tui.editor.cursorLineStart` | `home`, `ctrl+a` | 移动到行首 |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+e` | 移动到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳转到字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳转到字符 |
| `tui.editor.pageUp` | `pageUp` | 向上翻页滚动 |
| `tui.editor.pageDown` | `pageDown` | 向下翻页滚动 |

### TUI 编辑器删除

| 快捷键 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.editor.deleteCharBackward` | `backspace` | 向后删除字符 |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | 向前删除字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | 向后删除单词 |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | 向前删除单词 |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 删除至行首 |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 删除至行尾 |

### TUI 输入

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.input.newLine` | `shift+enter`, `ctrl+j` | 插入新行 |
| `tui.input.submit` | `enter` | 提交输入 |
| `tui.input.tab` | `tab` | Tab / 自动补全 |

### TUI 删除环

| 键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.editor.yank` | `ctrl+y` | 粘贴最新删除的文本 |
| `tui.editor.yankPop` | `alt+y` | 在粘贴后循环浏览删除的文本 |
| `tui.editor.undo` | `ctrl+-` | 撤销上次编辑 |

### TUI 剪贴板和选择

| 键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.input.copy` | `ctrl+c` | 复制选择 |
| `tui.select.up` | `up` | 向上移动选择 |
| `tui.select.down` | `down` | 向下移动选择 |
| `tui.select.pageUp` | `pageUp` | 列表向上翻页 |
| `tui.select.pageDown` | `pageDown` | 列表向下翻页 |
| `tui.select.confirm` | `enter` | 确认选择 |
| `tui.select.cancel` | `escape`, `ctrl+c` | 取消选择 |

### 应用程序

| 快捷键标识 | 默认值 | 描述 |
|--------|---------|-------------|
| `app.interrupt` | `escape` | 取消/中止 |
| `app.clear` | `ctrl+c` | 清空编辑器 |
| `app.exit` | `ctrl+d` | 退出 (当编辑器为空时) |
| `app.suspend` | `ctrl+z` (Windows 上无) | 挂起到后台 |
| `app.editor.external` | `ctrl+g` | 在外部编辑器中打开 (`externalEditor`, `$VISUAL`, `$EDITOR`, Windows 上的 Notepad, 或其他系统上的 `nano`) |
| `app.clipboard.pasteImage` | `ctrl+v` (Windows 上的 `alt+v`) | 从剪贴板粘贴图片 |

### 会话

| 快捷键 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.session.new` | *(none)* | 开始新会话 (`/new`) |
| `app.session.tree` | *(none)* | 打开会话树导航器 (`/tree`) |
| `app.session.fork` | *(none)* | 分叉当前会话 (`/fork`) |
| `app.session.resume` | *(无)* | 打开会话恢复选择器 (`/resume`) |
| `app.session.togglePath` | `ctrl+p` | 切换路径显示 |
| `app.session.toggleSort` | `ctrl+s` | 切换排序模式 |
| `app.session.toggleNamedFilter` | `ctrl+n` | 切换 named-only 过滤器 |
| `app.session.rename` | `ctrl+r` | 重命名会话 |
| `app.session.delete` | `ctrl+d` | 删除会话 |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 查询为空时删除会话 |

### 模型与思考

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 切换到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p` | 切换到上一个模型 |
| `app.thinking.cycle` | `shift+tab` | 切换思考级别 |
| `app.thinking.toggle` | `ctrl+t` | 折叠或展开思考块 |

### 显示与消息队列

| 快捷键 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.tools.expand` | `ctrl+o` | 折叠或展开工具输出 |
| `app.message.copy` | `ctrl+x` | 复制最后一条助手消息，或 `/tree` 中选中的消息 |
| `app.message.followUp` | `alt+enter` | 将 follow-up 消息加入队列 |
| `app.message.dequeue` | `alt+up` | 将队列中的消息恢复到编辑器中 |

### 树导航

| 快捷键标识 | 默认值 | 描述 |
|--------|---------|-------------|
| `app.tree.foldOrUp` | `ctrl+left`, `alt+left` | 折叠当前分支片段，或跳转到上一个片段起始处 |
| `app.tree.unfoldOrDown` | `ctrl+right`, `alt+right` | 展开当前分支片段，或跳转到下一个片段起始处或分支结束处 |
| `app.tree.editLabel` | `shift+l` | 编辑选中的树节点上的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换树中标签的时间戳显示 |
| `app.tree.filter.default` | `ctrl+d` | 将树过滤器设置为默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 切换隐藏工具结果的树过滤器 |
| `app.tree.filter.userOnly` | `ctrl+u` | 切换仅显示用户消息的树过滤器 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 切换仅显示已标记条目的树过滤器 |
| `app.tree.filter.all` | `ctrl+a` | 切换显示所有条目的树过滤器 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环切换树过滤器 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环切换树过滤器 |

### 范围模型选择器

在通过 `/scoped-models`)打开的 (范围模型选择器中使用。

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.models.save` | `ctrl+s` | 将当前模型选择保存到设置 |
| `app.models.enableAll` | `ctrl+a` | 启用所有模型(或所有符合当前搜索条件的模型) |
| `app.models.clearAll` | `ctrl+x` | 清除所有模型(或所有符合当前搜索条件的模型) |
| `app.models.toggleProvider` | `ctrl+p` | 切换当前模型提供商的所有模型 |
| `app.models.reorderUp` | `alt+up` | 将选中的模型在循环顺序中上移 |
| `app.models.reorderDown` | `alt+down` | 将选中的模型在循环顺序中下移 |

## 自定义配置

创建`~/.pi/agent/keybindings.json`:

```json
{
  "tui.editor.cursorUp": ["up", "ctrl+p"],
  "tui.editor.cursorDown": ["down", "ctrl+n"],
  "tui.editor.deleteWordBackward": ["ctrl+w", "alt+backspace"]
}
```

每个操作可以有一个按键或按键数组。用户配置会覆盖默认设置。

在原生 Windows 上，`app.suspend` 没有默认绑定，因为 Windows 终端不支持 Unix 作业控制。如果手动绑定， pi 会显示状态消息而不是挂起。在 WSL 中，正常的 Linux `ctrl+z`/`fg` 行为仍然适用。

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
