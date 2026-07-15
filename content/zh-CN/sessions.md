# 会话｜Sessions

Pi 将会话保存为会话，以便您可以继续工作、从早期轮次分支并重新访问之前的路径。

## 会话存储

会话 auto-save 至 `~/.pi/agent/sessions/`，按工作目录组织。每个会话是一个具有树结构的 JSONL 文件。

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse and select from past sessions
pi --no-session        # Ephemeral mode; do not save
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Use a specific session file or partial session ID
pi --fork <path|id>    # Fork a session file or partial session ID into a new session
```

在交互模式下使用 `/session` 查看当前会话文件、会话 ID、消息数、令牌数和成本。

关于 JSONL 文件格式及 SessionManager API，请参阅 [会话格式](session-format.md)。

## 会话命令

| 命令 | 描述 |
|---------|-------------|
| `/resume` | 浏览并选择先前的会话 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置当前会话显示名称 |
| `/session` | 显示会话信息 |
| `/tree` | 浏览当前会话树 |
| `/fork` | 从之前的用户消息创建新会话 |
| `/clone` | 将当前活动分支复制到新会话中 |
| `/compact [prompt]` | 总结较早的上下文；参见 [上下文压缩](compaction.md) |
| `/export [file]` | 将会话导出到 HTML |
| `/share` | 以私有 GitHub gist 形式上传，附带可分享的 HTML 链接 |

## 恢复和删除会话

`/resume` 为当前项目打开交互式会话选择器。`pi -r` 在启动时打开相同的选择器。

在选择器中，您可以：

- 通过输入进行搜索
- 按 Ctrl+P 切换路径显示
- 按 Ctrl+S 切换排序模式
- 按 Ctrl+N 筛选命名会话
- 按 Ctrl+R 重命名
- 按 Ctrl+D 删除，然后确认

可用时， pi 使用 `trash` CLI 进行删除，而非永久删除文件。

## 命名会话

使用 `/name <name>` 设置 human-readable 会话名称：

```text
/name Refactor auth module
```

启动时通过 `--name` 或 `-n` 设置名称：

```bash
pi --name "Refactor auth module"
pi --name "CI audit" -p "Review this build failure"
```

命名后的会话更易于 find in `/resume` 和 `pi -r`。

## 使用 `/tree` 进行分支

会话以树形结构存储。每个条目都有 `id` 和 `parentId`，当前位置是活动叶节点。`/tree` 允许跳转到任意历史节点并从该处继续，而无需创建新文件。

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

### 树控件

| 按键 | 操作 |
|-----|--------|
| ↑/↓ | 导航可见条目 |
| ←/→ | 上/下翻页 |
| Ctrl+←/Ctrl+→ 或 Alt+←/Alt+→ | 折叠/展开或跳转分支段 |
| Shift+L | 为选中条目设置或清除标签 |
| Shift+T | 切换标签时间戳显示 |
| 回车 | 选择条目 |
| Esc/Ctrl+C | 取消 |
| Ctrl+O | 循环筛选模式 |

筛选模式有： default、no-tools、user-only、labeled-only和 all。通过在[设置](settings.md)中的`treeFilterMode`配置默认值。

### 选择行为

选择用户或自定义消息：

1. 将叶子节点移动到所选消息的父节点。
2. 将所选消息文本放入编辑器。
3. 允许编辑并重新提交，创建新分支。

选择助手、工具、压缩或其他non-user条目：

1. 将叶子节点移动到该条目。
2. 使编辑器保持为空。
3. 允许从该点继续。

选择根用户消息会将叶子节点重置为空会话，并将原始提示词放入编辑器。

## `/tree`、`/fork`和`/clone`

| 功能 | `/tree` | `/fork` | `/clone` |
|---------|---------|---------|----------|
| 输出 | 相同会话文件 | 新会话文件 | 新会话文件 |
| 视图 | 完整树 | 用户消息选择器 | 当前活动分支 |
| 典型用途 | 原地探索替代方案 | 从之前的提示开始新会话 | 继续前复制当前工作 |
| 摘要 | 可选分支摘要 | 无 | 无 |

当您希望将替代方案保持在一起时，使用 `/tree`。当您希望有单独的会话文件时，使用 `/fork` 或 `/clone`。

## 分支摘要

当 `/tree` 从一个分支切换到另一个分支时， pi 可以汇总被放弃的分支并将该摘要附加到新位置。这保留了您离开路径中的重要上下文，而无需重播整个分支。

提示时，选择以下之一：

1. 无摘要
2. 使用默认提示进行摘要
3. 使用自定义关注指令进行摘要

有关分支汇总的内部实现和扩展挂钩，请参阅 [上下文压缩](compaction.md)。

## 会话格式

会话文件是 JSONL 格式，包含消息条目、模型更改、thinking-level 更改、标签、上下文压缩、分支摘要和扩展条目。

有关解析器、扩展、SDK 使用以及完整的 SessionManager API，请参阅 [会话格式](session-format.md)。
