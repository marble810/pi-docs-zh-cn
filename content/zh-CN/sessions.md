# 会话

Pi 将会话保存为对话记录，以便您继续工作、从之前的轮次创建分支以及回溯先前的路径。

## 会话存储

会话 auto-save 至 `~/.pi/agent/sessions/`，按工作目录组织。每个会话都是一个包含树状结构的 JSONL 文件。

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse and select from past sessions
pi --no-session        # Ephemeral mode; do not save
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Use a specific session file or partial session ID
pi --fork <path|id>    # Fork a session file or partial session ID into a new session
```

在交互模式下使用 `/session` 可查看当前会话文件、会话 ID、消息数量、token 用量及费用。

有关 JSONL 文件格式和 SessionManager API，请参阅 [会话 Format](session-format.md)。

## 会话命令

| 命令                | 描述                                              |
| ------------------- | ------------------------------------------------- |
| `/resume`           | 浏览并选择之前的会话                              |
| `/new`              | 开始新会话                                        |
| `/name <name>`      | 设置当前会话的显示名称                            |
| `/session`          | 显示会话信息                                      |
| `/tree`             | 导航当前会话树                                    |
| `/fork`             | 从之前的用户消息创建新会话                        |
| `/clone`            | 将当前活跃分支复制到新会话中                      |
| `/compact [prompt]` | 总结较旧的上下文；参见[上下文压缩](compaction.md) |
| `/export [file]`    | 将会话导出到HTML                                  |
| `/share`            | 上传为私有GitHub gist ，并附带可分享的HTML链接    |

## 恢复和删除会话

`/resume` 会为当前项目打开一个交互式会话选择器。`pi -r` 则在启动时打开同一个选择器。

在选择器中你可以：

- 通过输入进行搜索
- 使用 Ctrl+P 切换路径显示
- 使用 Ctrl+S 切换排序模式
- 使用 Ctrl+N 筛选已命名的会话
- 使用 Ctrl+R 重命名
- 使用 Ctrl+D 删除，然后确认

在可用时， pi 会使用 `trash` CLI 进行删除，而不是永久移除文件。

## 命名会话

使用 `/name <name>` 设置一个 human-readable 会话名称：

```text
/name Refactor auth module
```

在启动时使用 `--name` 或 `-n` 设置名称：

```bash
pi --name "Refactor auth module"
pi --name "CI audit" -p "Review this build failure"
```

已命名的会话更容易 find in `/resume` 和 `pi -r`。

## 使用 `/tree` 进行分支

会话以树状结构存储。每个条目都有一个 `id` 和 `parentId`，当前位置是活动叶子节点。`/tree` 允许你跳转到任意之前的位置并从那里继续，而无需创建新文件。

<p align="center"><img src="images/tree-view.png" alt="Tree View" width="600"></p>

示例结构：

```text
├─ user: "Hello, can you help..."
│  └─ assistant: "Of course! I can..."
│     ├─ user: "Let's try approach A..."
│     │  └─ assistant: "For approach A..."
│     │     └─ user: "That worked..."  ← active
│     └─ user: "Actually, approach B..."
│        └─ assistant: "For approach B..."
```

### 树形控件

| 按键                         | 操作                        |
| ---------------------------- | --------------------------- |
| ↑/↓                          | 导航可见条目                |
| ←/→                          | 上/下翻页                   |
| Ctrl+←/Ctrl+→ 或 Alt+←/Alt+→ | 折叠/展开或在分支段落间跳转 |
| Shift+L                      | 为选中条目设置或清除标签    |
| Shift+T                      | 切换标签时间戳显示          |
| Enter                        | 选择条目                    |
| Escape/Ctrl+C                | 取消                        |
| Ctrl+O                       | 循环切换筛选模式            |

筛选模式包括：默认、no-tools、user-only、labeled-only 和全部。可通过 [Settings](settings.md) 中的 `treeFilterMode` 配置默认模式。

### 选择行为

选择用户或自定义消息时：

1. 将叶子节点移至所选消息的父级。
2. 将所选消息文本放入编辑器。
3. 允许编辑并重新提交，从而创建新分支。

选择助手、工具、上下文压缩或其他 non-user 条目时：

1. 将叶子节点移至该条目。
2. 编辑器保持空白。
3. 允许从该点继续。

选择根用户消息会将叶子节点重置为空对话，并将原始提示词放入编辑器。

## `/tree`、`/fork` 和 `/clone`

| 功能     | `/tree`          | `/fork`                  | `/clone`               |
| -------- | ---------------- | ------------------------ | ---------------------- |
| 输出     | 同一会话文件     | 新会话文件               | 新会话文件             |
| 视图     | 完整树           | 用户消息选择器           | 当前活动分支           |
| 典型用途 | 原地探索替代方案 | 从更早的提示词开始新会话 | 在继续之前复制当前工作 |
| 摘要     | 可选分支摘要     | 无                       | 无                     |

当你想将替代方案保留在一起时，使用 `/tree`。当你想使用单独的会话文件时，使用 `/fork` 或 `/clone`。

## 分支摘要

当 `/tree` 从一个分支切换到另一个分支时， pi 可以总结被放弃的分支，并将该摘要附加到新位置。这保留了你离开的路径中的重要上下文，而无需重放整个分支。

当出现提示时，选择以下之一：

1. 无摘要
2. 使用默认提示词进行总结
3. 使用自定义聚焦指令进行总结

有关分支总结的内部机制和扩展钩子，请参阅[上下文压缩](compaction.md)。

## 会话格式

会话文件为JSONL格式，包含消息条目、模型变更、thinking-level变更、标签、上下文压缩、分支总结和扩展条目。

有关解析器、扩展、SDK用法以及完整的SessionManagerAPI，请参阅[会话格式](session-format.md)。
