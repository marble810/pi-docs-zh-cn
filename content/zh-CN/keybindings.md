# 键位绑定参考｜ Keybindings Reference

Pi 公开了命名操作，例如 `app.session.new`，可以为其分配键位绑定。你可以在 Pi 的 [用户配置](configuration.md#agent-directory) 中更改默认分配或为未分配的操作绑定键位。

运行 `/hotkeys` 以查看主编辑器和应用程序的活动快捷键。

## 分配键位绑定｜ Assign keybindings

创建 `<agent-dir>/keybindings.json`。代理目录默认为 `~/.pi/agent`，并在 [代理 directory](configuration.md#agent-directory) 中进行了描述。

将每个操作标识符映射到一个键或一个键列表：

```json
{
  "app.session.new": "ctrl+shift+n",
  "app.session.tree": ["ctrl+shift+t", "alt+shift+t"]
}
```

配置的值会替换该操作的默认值。使用空列表可禁用某个操作的键位绑定：

```json
{
  "tui.altScreen.pageUp": []
}
```

编辑文件后，运行 `/reload` 以将更改应用到活动会话。

## 键语法｜ Key syntax

使用 `modifier+key` 写入按键。修饰键为 `ctrl`、`shift`、`alt` 和 `super`。你可以组合修饰键。有效的按键为：

- **字母：** `a-z`
- **数字：** `0-9`
- **特殊：** `escape`、`esc`、`enter`、`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right`
- **功能键：** `f1`-`f12`
- **符号：** `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `_`, `+`, `|`, `~`, `{`, `}`, `:`, `<`, `>`, `?`

示例：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+super+k` 和 `ctrl+1`。

`super` 绑定需要终端单独报告修饰键，通常通过 Kitty 键盘协议实现。在不支持该功能的终端中，它们可能无法工作。

## 操作｜ Actions

### 终端 UI ｜终端 UI

#### 光标移动｜ Cursor movement

| 按键绑定 ID ｜ Keybinding id | 默认｜ Default | 描述｜ Description |
|---|---|---|
| `tui.editor.cursorUp` | `up` | 向上移动光标，在顶部浏览更早的历史记录 |
| `tui.editor.cursorDown` | `down` | 向下移动光标，在底部浏览更新的历史记录 |
| `tui.editor.historyPrevious` | 无｜ None | 选择上一条提示词历史记录 |
| `tui.editor.historyNext` | 无 | 选择下一个提示词历史记录条目 |
| `tui.editor.cursorLeft` | `left`, `ctrl+b` | 向左移动光标 |
| `tui.editor.cursorRight` | `right`, `ctrl+f` | 向右移动光标 |
| `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | 向左移动光标一个单词 |
| `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | 向右移动光标一个单词 |
| `tui.editor.cursorLineStart` | `home`, `ctrl+home`, `ctrl+a` | 移动到行首 |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+end`, `ctrl+e` | 移动到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳转到字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳转到字符 |
| `tui.editor.pageUp` | `pageUp`, `ctrl+pageUp` | 向上翻页滚动 |
| `tui.editor.pageDown` | `pageDown`, `ctrl+pageDown` | 向下翻页滚动 |

专用的历史记录操作会浏览提示词历史，不受光标位置影响，并且优先于使用相同按键的应用程序操作。

#### 文本编辑

| 按键绑定 id | 默认 | 描述 |
|---|---|---|
| `tui.editor.deleteCharBackward` | `backspace` | 向后删除字符 |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | 向前删除字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | 向后删除单词 |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | 向前删除单词 |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 删除至行首 |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 删除至行尾 |
| `tui.editor.yank` | `ctrl+y` | 粘贴最近删除的文本 |
| `tui.editor.yankPop` | `alt+y` | 在粘贴后循环浏览已删除的文本 |
| `tui.editor.undo` | `ctrl+-` (`ctrl+z` 在 Windows 上；`alt+z` 在 WSL) 上 | 撤销上次编辑 |

#### 输入与选择

| 按键绑定 id | 默认 | 描述 |
|---|---|---|
| `tui.input.newLine` | `shift+enter`、`ctrl+j` | 插入新行 |
| `tui.input.submit` | `enter` | 提交输入 |
| `tui.input.tab` | `tab` | Tab 或自动补全 |
| `tui.input.copy` | `ctrl+c` | 复制选中内容 |
| `tui.select.up` | `up` | 向上移动选中项 |
| `tui.select.down` | `down` | 向下移动选中项 |
| `tui.select.pageUp` | `pageUp` | 在列表中向上翻页 |
| `tui.select.pageDown` | `pageDown` | 在列表中向下翻页 |
| `tui.select.confirm` | `enter` | 确认选择 |
| `tui.select.cancel` | `escape`、`ctrl+c` | 取消选择 |

#### 全屏

在全屏模式下，这些操作控制对话记录，并优先于使用相同按键的编辑器操作。

| 按键绑定 id | 默认 | 描述 |
|---|---|---|
| `tui.altScreen.pageUp` | `pageUp` | 将对话记录向上滚动一页 |
| `tui.altScreen.pageDown` | `pageDown` | 将对话记录向下滚动一页 |
| `tui.altScreen.halfPageUp` | 无 | 将对话记录向上滚动半页 |
| `tui.altScreen.halfPageDown` | 无 | 将对话记录向下滚动半页 |
| `tui.altScreen.lineUp` | 无 | 将对话记录向上滚动一行 |
| `tui.altScreen.lineDown` | 无 | 将对话记录向下滚动一行 |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up`、`ctrl+up` (`ctrl+up` 仅在 Windows 上，以及 WSL) | 跳转到上一条标记的消息 |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down`、`ctrl+down` (`ctrl+down` 仅在 Windows 上，以及 WSL) | 跳转到下一条标记的消息 |
| `tui.altScreen.search` | `ctrl+shift+f` (`ctrl+f` 在 Windows 上，以及 WSL) | 搜索渲染后的对话记录 |
| `tui.altScreen.searchNext` | `enter`、`ctrl+g` | 搜索时选择下一个匹配项 |
| `tui.altScreen.searchPrevious` | `shift+enter`、`ctrl+shift+g` | 搜索时选择上一个匹配项 |
| `tui.altScreen.searchClose` | `escape` | 关闭对话记录搜索 |
| `tui.altScreen.top` | `home` | 滚动到对话记录的开头 |
| `tui.altScreen.bottom` | `end` | 滚动到转录末尾并跟随新输出 |

### 应用程序

| 按键绑定 id | 默认 | 描述 |
|--------|---------|-------------|
| `app.interrupt` | `escape` | 取消 / 中止 |
| `app.clear` | `ctrl+c` | 清空编辑器 (第一次) / 退出 (第二次) |
| `app.exit` | `ctrl+d` | 退出 (当编辑器为空时) |
| `app.suspend` | `ctrl+z` (Windows 上无) | 挂起到后台 |
| `app.editor.external` | `ctrl+g` | 在外部编辑器中打开 (`externalEditor`、`$VISUAL`、`$EDITOR`、Windows 上的 Notepad ，或其他平台上的 `nano`) |
| `app.clipboard.pasteImage` | `ctrl+v` (Windows 上的 `alt+v` 和 WSL) | 从剪贴板粘贴图像或文本 |

在原生 Windows 上，`app.suspend` 没有默认值，因为 Windows 终端不支持 Unix 作业控制。如果你手动为其分配按键，Pi 会显示状态消息而不是挂起。WSL 使用正常的 `ctrl+z` 和 `fg` 行为。

### 会话｜ Sessions

| 快捷键 id ｜ Keybinding id | 默认｜ Default | 描述｜ Description |
|--------|---------|-------------|
| `app.session.new` | 无｜ None | 启动新会话 (`/new`) |
| `app.session.tree` | 无｜ None | 打开会话树导航器 (`/tree`) |
| `app.session.fork` | 无｜ None | 派生当前会话 (`/fork`) |
| `app.session.resume` | 无｜ None | 打开会话恢复选择器 (`/resume`) |
| `app.session.togglePath` | `ctrl+p` | 切换路径显示｜ Toggle path display |
| `app.session.toggleSort` | `ctrl+s` | 切换排序模式｜ Toggle sort mode |
| `app.session.toggleNamedFilter` | `ctrl+n` | 切换 named-only 过滤器 |
| `app.session.rename` | `ctrl+r` | 重命名会话 |
| `app.session.delete` | `ctrl+d` | 删除会话 |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 查询为空时删除会话 |

### 模型与思考｜ Models and Thinking

| 快捷键 id | 默认 | 描述 |
|--------|---------|-------------|
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 切换到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p` (`alt+p` 在 Windows 上以及 WSL) | 切换到上一个模型 |
| `app.models.save` | `ctrl+s` | 将选定的默认模型或作用域模型配置保存到设置 |
| `app.thinking.cycle` | `shift+tab` | 循环切换思考级别 |
| `app.thinking.save` | `ctrl+s` | 将当前思考级别保存到设置 |
| `app.thinking.toggle` | `ctrl+t` | 折叠或展开思考块 |

### 显示与消息队列｜ Display and Message Queue

| 键绑定 id | 默认 | 描述 |
|--------|---------|-------------|
| `app.tools.expand` | `ctrl+o` | 折叠或展开工具输出 |
| `app.message.copy` | `ctrl+x` | 在 `/tree` 中复制选中的消息；在全屏模式下，当 `fullscreenCopyOnSelect` 为 `false` 时复制当前选择；否则复制最后一条助手消息 |
| `app.message.followUp` | `alt+enter` (`ctrl+q` 在 Windows 上以及 WSL) | 将 follow-up 消息加入队列 |
| `app.message.dequeue` | `alt+up` (`alt+q` 在 Windows 上以及 WSL) | 将排队的消息恢复到编辑器 |

### 树导航｜ Tree Navigation

| 快捷键 id | 默认 | 描述 |
|--------|---------|-------------|
| `app.tree.foldOrUp` | `ctrl+left`、`alt+left` | 折叠当前分支段，或跳转到上一个段的起始位置 |
| `app.tree.unfoldOrDown` | `ctrl+right`、`alt+right` | 展开当前分支段，或跳转到下一个段的起始位置或分支末尾 |
| `app.tree.editLabel` | `shift+l` | 编辑所选树节点上的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换树中标签时间戳的显示 |
| `app.tree.filter.default` | `ctrl+d` | 将树筛选器设置为默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 切换隐藏工具结果的树过滤器 |
| `app.tree.filter.userOnly` | `ctrl+u` | 切换仅显示用户消息的树过滤器 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 切换仅显示已标记条目的树过滤器 |
| `app.tree.filter.all` | `ctrl+a` | 切换显示所有条目的树过滤器 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环切换树过滤器 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环切换树过滤器 |

### 作用域模型选择器｜ Scoped Models Selector

用于作用域模型选择器内部，通过 `/scoped-models` 打开()。

| 按键绑定 id | 默认 | 描述 |
|--------|---------|-------------|
| `app.models.enableAll` | `ctrl+a` | 启用所有模型(或所有匹配当前搜索的模型) |
| `app.models.clearAll` | `ctrl+x` | 清除所有模型 (或所有匹配当前搜索的模型) |
| `app.models.toggleProvider` | `ctrl+p` | 切换当前模型提供商的所有模型 |
| `app.models.reorderUp` | `alt+up` | 将选中的模型在循环顺序中上移 |
| `app.models.reorderDown` | `alt+down` | 将选中的模型在循环顺序中下移 |
