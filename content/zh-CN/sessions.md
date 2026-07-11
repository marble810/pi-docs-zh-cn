# 会话

Pi 将会话保存为会话，以便您可以继续工作、从之前的轮次分支以及重新访问之前的路径。

## 会话存储

Sessions auto-save to `~/.pi/agent/会话s/`, organized by working directory. Each session is a JSONL file with a tree structure.

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse and select from past sessions
pi --no-session        # Ephemeral mode; do not save
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Use a specific session file or partial session ID
pi --fork <path|id>    # Fork a session file or partial session ID into a new session
```

Use `/session` in interactive mode to see the current session file, session ID, message count, tokens, and cost.

For the JSONL file format and SessionManager API, see [会话格式](session-format.md).

## 会话命令ommand | 描述 |

|---------|-------------|
| `/resume` | 浏览并选择之前的会话 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置当前会话的显示名称 |
| `/session` | 显示会话信息 |
| `/tree` | 导航当前会话树 |
| `/fork|
| `/clone
| `| Summarize older context; see [Compaction](compaction.md) |
|` | |
| `` | |

##

`/resume` opens an interactive session picker for the current project. `pi -r` opens the same picker at startup.

-
-
-
-
-
-

When available, pi uses the `trash` CLI for deletion instead of permanently removing files.

##

Use `/name <name>` to set a human-readable session name:

```text
/name Refactor auth module
```

Set the name at startup with `--name` or `-n`:

```bash
pi --name "Refactor auth module"
pi --name "CI audit" -p "Review this build failure"
```

Named sessions are easier to find in `/resume` and `pi -r`.

## Branching with `/tree`

Sessions are stored as trees. Every entry has an `id` and `parentId`, and the current position is the active leaf. `/tree` lets you jump to any previous point and continue from there without creating a new file.

<p align="center"><img src="images/tree-view.png" alt="Tree 视图" width="600"></p>

```text
├─ user: "Hello, can you help..."
│  └─ assistant: "Of course! I can..."
│     ├─ user: "Let's try approach A..."
│     │  └─ assistant: "For approach A..."
│     │     └─ user: "That worked..."  ← active
│     └─ user: "Actually, approach B..."
│        └─ assistant: "For approach B..."
```

###

|     |     |
| --- | --- |
|     |     |
|     |     |
|     |     |
|     |     |
|     |     |
|     |     |
|     |     |
|     |     |

Filter modes are: default, no-tools, user-only, labeled-only, and all. Configure the default with `treeFilterMode` in [Settings](settings.md).

###

选择用户或自定义消息：

1. 将叶子节点移动到所选消息的父节点。
2. 将所选消息文本放入编辑器中。
3. 允许您编辑并重新提交，从而创建新分支。

选择助手、工具、上下文压缩或其他非用户条目：

1. 将叶子节点移动到该条目。
2. 保持编辑器为空。
3. 允许您从该点继续。

选择根用户消息会将叶子节点重置为空对话，并将原始提示词放入编辑器中。

## `/tree`, `/fork`, and `/clone`

| 功能     | `/tree`          | `/fork`                  | `/clone`               |
| -------- | ---------------- | ------------------------ | ---------------------- |
| 输出     | 同一会话文件     | 新会话文件ion file       |
| View     | 完整树           | 用户消息选择器           | 当前活动分支           |
| 典型用途 | 原地探索替代方案 | 从之前的提示词开始新会话 | 在继续之前复制当前工作 |
| 摘要     | 可选分支摘要     | 无None                   |

Use `/tree` when you want to keep alternatives together. Use `/fork` or `/clone` when you want a separate session file.

## 分支摘要

When `/tree` switches away from one branch to another, pi can summarize the abandoned branch and attach that summary at the new position. This preserves important context from the path you left without replaying the whole branch.

当提示时，选择以下之一：

1. 无摘要
2. 使用默认提示词进行摘要
3. 使用自定义关注点指令进行摘要

See [Compaction](compaction.md) for branch summarization internals and extension hooks.

## Session Format

会话文件是 JSONL 格式，包含消息条目、模型变更、思考级别变更、标签、上下文压缩、分支摘要和扩展条目。

For parsers, extensions, SDK usage, and the full SessionManager API, see [Session Format](session-format.md).
