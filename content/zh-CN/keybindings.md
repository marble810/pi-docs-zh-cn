# 按键绑定｜ Keybindings

所有键盘快捷键都可以通过 `~/.pi/agent/keybindings.json` 进行自定义。每个操作可以绑定到一个或多个按键。

配置文件使用与 pi 内部使用的相同的命名空间按键绑定 ID ，扩展作者在 `keyHint()` 和注入的 `keybindings` 管理器中也使用这些 ID。

使用 pre-namespaced ID （如 `cursorUp` 或 `expandTools`）的旧配置会在启动时自动迁移到命名空间 ID。

编辑 `keybindings.json` 后，在 pi 中运行 `/reload` 即可应用更改，无需重启会话。

## 按键格式｜ Key Format

`modifier+key` 其中修饰键为 `ctrl`、`shift`、`alt`、`super`，可(组合)，按键为：

- **字母：** `a-z`
- **数字：** `0-9`
- **特殊键：** `escape`、`esc`、`enter`、`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right`
- **函数：** `f1`-`f12`
- **符号：** `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `_`, `+`, `|`, `~`, `{`, `}`, `:`, `<`, `>`, `?`

修饰键组合：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+super+k`、`ctrl+1`等。

`super`绑定需要终端单独报告修饰键，通常通过 Kitty 键盘协议。在不支持该协议的终端中可能无法工作。

## 所有操作

### TUI编辑器光标移动

| 键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.editor.cursorUp` | `up` | 向上移动光标，浏览顶部较旧的历史记录 |
| `tui.editor.cursorDown` | `down` | 向下移动光标，浏览底部较新的历史记录 |
| `tui.editor.historyPrevious` | *(无)* | 选择上一条提示历史记录 |
| `tui.editor.historyNext` | *(无)* | 选择下一条提示历史记录 |
| `tui.editor.cursorLeft` | `left`、`ctrl+b` | 向左移动光标 |
| `tui.editor.cursorRight` | `right`、`ctrl+f` | 向右移动光标 |
| `tui.editor.cursorWordLeft` | `alt+left`、`ctrl+left`、`alt+b` | 向左移动光标一个单词 |
| `tui.editor.cursorWordRight` | `alt+right`、`ctrl+right`、`alt+f` | 向右移动光标一个单词 |
| `tui.editor.cursorLineStart` | `home`、`ctrl+home`、`ctrl+a` | 移动到行首 |
| `tui.editor.cursorLineEnd` | `end`、`ctrl+end`、`ctrl+e` | 移动到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳转到字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳转到字符 |
| `tui.editor.pageUp` | `pageUp`、`ctrl+pageUp` | 按页向上滚动 |
| `tui.editor.pageDown` | `pageDown`, `ctrl+pageDown` | 按页向下滚动 |

专用的历史记录操作始终会更改历史记录条目，无论光标在多行提示中的位置如何。当主编辑器处于焦点时，显式历史记录绑定优先于应用程序操作，因此将 `tui.editor.historyPrevious` 绑定到 `ctrl+p` 会在该上下文中覆盖模型循环，而不会更改选择器中的 `Ctrl+P`。

### TUI 编辑器删除

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.editor.deleteCharBackward` | `backspace` | 向后删除字符 |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | 向前删除字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | 向后删除单词 |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | 向前删除单词 |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 删除到行首 |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 删除到行尾 |

### TUI 输入

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.input.newLine` | `shift+enter`、`ctrl+j` | 插入新行 |
| `tui.input.submit` | `enter` | 提交输入 |
| `tui.input.tab` | `tab` | Tab / 自动补全 |

### TUI 剪贴环

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.editor.yank` | `ctrl+y` | 粘贴最近删除的文本 |
| `tui.editor.yankPop` | `alt+y` | 在 yank 后循环浏览已删除的文本 |
| `tui.editor.undo` | `ctrl+-` | 撤销上次编辑 |

### TUI 剪贴板与选择

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.input.copy` | `ctrl+c` | 复制选择内容 |
| `tui.select.up` | `up` | 向上移动选择 |
| `tui.select.down` | `down` | 向下移动选择 |
| `tui.select.pageUp` | `pageUp` | 在列表中向上翻页 |
| `tui.select.pageDown` | `pageDown` | 在列表中向下翻页 |
| `tui.select.confirm` | `enter` | 确认选择 |
| `tui.select.cancel` | `escape`, `ctrl+c` | 取消选择 |

### TUI 全屏视口

当交互模式使用 `--tui-mode fullscreen` 时，这些操作适用于主转录滚动区域。双指触控板和 mouse-wheel 输入会滚动指针下的区域，若指针不在固定编辑器/状态/底部停靠区上，则回退到转录区域。点击 OSC 8 超链接会在默认处理程序中打开。使用主鼠标按钮拖动可选择文本并复制到剪贴板；在转录区域顶部或底部边缘按住会 auto-scrolls 到 off-screen 内容。

全屏转录绑定优先于编辑器绑定。因此，在默认无修饰键的导航键在全屏模式下控制转录区域，而其 `ctrl` 变体继续控制编辑器。在全屏模式之外，两种变体都控制编辑器。

| 按键 | 默认模式 | 全屏模式 |
|-----|--------------|-----------------|
| `home`, `end` | 编辑器 | 转录区域 |
| `ctrl+home`, `ctrl+end` | 编辑器 | 编辑器 |
| `pageUp`, `pageDown` | 编辑器 | 转录区域 |
| `ctrl+pageUp`, `ctrl+pageDown` | 编辑器 | 编辑器 |

这种路由仍可通过常规操作绑定进行配置。例如，`"tui.altScreen.pageUp": "ctrl+pageUp"` 使 `pageUp` 控制编辑器，`ctrl+pageUp` 在全屏模式下控制转录区域。绑定 `tui.altScreen.halfPageUp` 和 `tui.altScreen.halfPageDown` 以获得更小的转录步进，同时保留 full-page 绑定。设置 `"tui.altScreen.pageUp": []` 将完全禁用该转录快捷键。用户绑定会替换该操作的默认值。

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `tui.altScreen.pageUp` | `pageUp` | 将记录向上滚动一页 |
| `tui.altScreen.pageDown` | `pageDown` | 将记录向下滚动一页 |
| `tui.altScreen.halfPageUp` | *(无)* | 将记录向上滚动半页 |
| `tui.altScreen.halfPageDown` | *(无)* | 将记录向下滚动半页 |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up` | 跳转到上一条标记的消息 |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down` | 跳转到下一条标记的消息 |
| `tui.altScreen.top` | `home` | 滚动到记录的开头 |
| `tui.altScreen.bottom` | `end` | 滚动到会话记录末尾并跟随新输出 |

### 应用

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.interrupt` | `escape` | 取消 / 中止 |
| `app.clear` | `ctrl+c` | 清除编辑器(第一次) / 退出(第二次) |
| `app.exit` | `ctrl+d` | 退出(当编辑器为空时) |
| `app.suspend` | `ctrl+z` (Windows 上无此操作) | 挂起到后台 |
| `app.editor.external` | `ctrl+g` | 在外部编辑器中打开 (`externalEditor`, `$VISUAL`, `$EDITOR`, Windows 上的记事本，或其他位置的 `nano`) |
| `app.clipboard.pasteImage` | `ctrl+v` (`alt+v` 在 Windows 上) | 从剪贴板粘贴图像或文本 |

### 会话

| 键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.session.new` | *(无)* | 开始新会话 (`/new`) |
| `app.session.tree` | *(无)* | 打开会话树导航器 (`/tree`) |
| `app.session.fork` | *(无)* | 分叉当前会话 (`/fork`) |
| `app.session.resume` | *(无)* | 打开会话恢复选择器 (`/resume`) |
| `app.session.togglePath` | `ctrl+p` | 切换路径显示 |
| `app.session.toggleSort` | `ctrl+s` | 切换排序模式 |
| `app.session.toggleNamedFilter` | `ctrl+n` | 切换 named-only 筛选器 |
| `app.session.rename` | `ctrl+r` | 重命名会话 |
| `app.session.delete` | `ctrl+d` | 删除会话 |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 查询为空时删除会话 |

### 模型与思考｜ Models and Thinking

| 键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 切换到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p` | 切换到上一个模型 |
| `app.thinking.cycle` | `shift+tab` | 循环思考级别 |
| `app.thinking.toggle` | `ctrl+t` | 折叠或展开思考块 |

### 显示与消息队列

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.tools.expand` | `ctrl+o` | 折叠或展开工具输出 |
| `app.message.copy` | `ctrl+x` | 复制最后一条助手消息，或 `/tree` 中选中的消息 |
| `app.message.followUp` | `alt+enter` | 将 follow-up 消息加入队列 |
| `app.message.dequeue` | `alt+up` | 将排队消息恢复到编辑器 |

### 树形导航

| 按键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.tree.foldOrUp` | `ctrl+left`、`alt+left` | 折叠当前分支段，或跳转到上一个段起点 |
| `app.tree.unfoldOrDown` | `ctrl+right`、`alt+right` | 展开当前分支段，或跳转到下一个段起点或分支末尾 |
| `app.tree.editLabel` | `shift+l` | 编辑所选树节点的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换树中标签的时间戳显示 |
| `app.tree.filter.default` | `ctrl+d` | 将树过滤器设置为默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 切换隐藏工具结果的树过滤器 |
| `app.tree.filter.userOnly` | `ctrl+u` | 切换仅显示用户消息的树过滤器 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 切换树过滤器，仅显示已标记的条目 |
| `app.tree.filter.all` | `ctrl+a` | 切换树过滤器，显示所有条目 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环切换树过滤器 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环切换树过滤器 |

### 作用域模型选择器

用于作用域模型选择器中，通过 `/scoped-models` 打开(。)

| 键绑定 ID | 默认 | 描述 |
|--------|---------|-------------|
| `app.models.save` | `ctrl+s` | 将当前模型选择保存到设置中 |
| `app.models.enableAll` | `ctrl+a` | 启用所有模型(或所有匹配当前搜索的模型) |
| `app.models.clearAll` | `ctrl+x` | 清除所有模型(或所有匹配当前搜索的模型) |
| `app.models.toggleProvider` | `ctrl+p` | 切换当前模型提供商的所有模型 |
| `app.models.reorderUp` | `alt+up` | 在循环顺序中将选中的模型上移 |
| `app.models.reorderDown` | `alt+down` | 在循环顺序中将选中的模型下移 |

## 自定义配置｜ Custom 配置

创建`~/.pi/agent/keybindings.json`：

```json
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.deleteWordBackward": ["ctrl+w", "alt+backspace"]
}
```

每个操作可以有一个键或一个键数组。用户配置会覆盖默认配置。

在原生 Windows 上，`app.suspend` 没有默认绑定，因为 Windows 终端不支持 Unix 作业控制。如果你手动绑定它， pi 会显示状态消息而不是挂起。在 WSL 中，正常的 Linux `ctrl+z`/`fg` 行为仍然适用。

### Emacs 示例｜ Emacs Example

```json
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.cursorLeft": ["left", "ctrl+b"],
  "tui.editor.cursorRight": ["right", "ctrl+f"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+f"],
  "tui.editor.deleteCharForward": ["delete", "ctrl+d"],
  "tui.editor.deleteCharBackward": ["backspace", "ctrl+h"],
  "tui.input.newLine": ["shift+enter", "ctrl+j"]
}
```

### Vim 示例｜ Vim Example

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
