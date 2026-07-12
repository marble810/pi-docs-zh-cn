# 上下文压缩与分支摘要

大语言模型的上下文窗口有限。当对话过长时， pi 会使用上下文压缩来总结较早的内容，同时保留近期工作。本页涵盖 auto-compaction 和分支摘要。

**源文件** ([pi-mono](https://github.com/earendil-works/pi-mono))：

- [`packages/coding-agent/src/core/compaction/compaction.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) - 自动压缩逻辑
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) - 分支摘要
- [`packages/coding-agent/src/core/compaction/utils.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/utils.ts) - 共享工具 (文件跟踪、序列化)
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/session-manager.ts) - 条目类型 (`CompactionEntry`、`BranchSummaryEntry`)
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/extensions/types.ts) - 扩展事件类型

关于项目中的 TypeScript 定义，请查看 `node_modules/@earendil-works/pi-coding-agent/dist/`。

## 概述

Pi 有两种摘要机制：

| 机制       | 触发条件                      | 目的                       |
| ---------- | ----------------------------- | -------------------------- |
| 上下文压缩 | 上下文超过阈值，或 `/compact` | 总结旧消息以释放上下文空间 |
| 分支摘要   | `/tree` 导航                  | 切换分支时保留上下文       |

两者使用相同的结构化摘要格式，并累积跟踪文件操作。

## 上下文压缩

### 触发时机

自动压缩在以下情况触发：

```
contextTokens > contextWindow - reserveTokens
```

默认情况下，`reserveTokens` 为 16384 个令牌，(可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json`) 中配置。这为 LLM 的响应留出空间。

你也可以通过 `/compact [instructions]` 手动触发，其中可选的指令用于聚焦摘要内容。

### 工作原理

1. **查找切割点**：从最新消息向后遍历，累计 token 估算值，直到达到 `keepRecentTokens` (默认 20k ，可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置)
2. **提取消息**：收集从上一个保留边界 (或会话开始) 到切割点之间的消息
3. **生成摘要**：调用 LLM 以结构化格式进行摘要，如果存在之前的摘要，则将其作为迭代上下文传入
4. **追加条目**：保存带有摘要和 `firstKeptEntryId` 的 `CompactionEntry`
5. **重新加载**：会话重新加载，使用摘要以及从 `firstKeptEntryId` 开始的消息

```
Before compaction:

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               messagesToSummarize            kept messages
                                   ↑
                          firstKeptEntryId (entry 4)

After compaction (new entry appended):

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                 not sent to LLM                    sent to LLM
                                                         ↑
                                              starts from firstKeptEntryId

What the LLM sees:

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    prompt   from cmp          messages from firstKeptEntryId
```

在重复压缩时，被摘要的区间从上一次压缩的保留边界 (`firstKeptEntryId`) 开始，而不是从压缩条目本身开始；如果在路径中找不到该保留条目，则回退到上一次压缩之后的条目。这使得在之前的压缩中幸存的消息也能被包含在下一次摘要过程中。Pi 还会在写入新的 `CompactionEntry` 之前，根据重建的会话上下文重新计算 `tokensBefore`，因此 token 计数反映了被替换的实际 pre-compaction 上下文。

### 分割轮次

一个“轮次”以一条用户消息开始，并包含所有助手响应和工具调用，直到下一条用户消息。通常，压缩会在轮次边界处进行切割。

当单个轮次超过 `keepRecentTokens` 时，切割点会落在助手消息的 mid-turn。这被称为“分割轮次”：

```
Split turn (one huge turn exceeds budget):

  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘
                                                      └── kept (7-8)

  isSplitTurn = true
  messagesToSummarize = []  (no complete turns before)
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

对于分割轮次， pi 会生成两个摘要并将其合并：

1. **历史摘要**：之前的上下文 (如果有)
2. **轮次前缀摘要**：分割轮次的前半部分

### 切割点规则

有效的切割点包括：

- 用户消息
- 助手消息
- BashExecution 消息
- 自定义消息 (custom_message、branch_summary)

绝不在工具结果处切割 (它们必须与其工具调用保持在一起)。

### CompactionEntry 结构

定义在 [`session-manager.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface CompactionEntry<T = unknown> {
  type: "compaction";
  id: string;
  parentId: string;
  timestamp: number;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  fromHook?: boolean; // true if provided by extension (legacy field name)
  details?: T; // implementation-specific data
}

// Default compaction uses this for details (from compaction.ts):
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

扩展可以在 `details` 中存储任何 JSON 可序列化的数据。默认的上下文压缩会跟踪文件操作，但自定义扩展实现可以使用自己的结构。

实现参见 [`prepareCompaction()`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) 和 [`compact()`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)。

## 分支摘要

### 触发时机

当你使用 `/tree` 导航到不同分支时， pi 会提示你总结即将离开的工作。这会将离开分支的上下文注入到新分支中。

### 工作原理

1. **查找共同祖先**：通过新旧位置找到最深的 node shared
2. **收集条目**：从旧叶子节点回溯到共同祖先
3. **按预算准备**：包含不超过令牌预算的消息 (最新的优先)
4. **生成摘要**：使用结构化格式调用 LLM
5. **追加条目**：在导航点保存 `BranchSummaryEntry`

```
Tree before navigation:

         ┌─ B ─ C ─ D (old leaf, being abandoned)
    A ───┤
         └─ E ─ F (target)

Common ancestor: A
Entries to summarize: B, C, D

After navigation with summary:

         ┌─ B ─ C ─ D ─ [summary of B,C,D]
    A ───┤
         └─ E ─ F (new leaf)
```

### 累积文件跟踪

上下文压缩和分支摘要都会累积跟踪文件。生成摘要时， pi 会从以下来源提取文件操作：

- 正在被摘要的消息中的工具调用
- 先前的上下文压缩或分支摘要 `details` (（如果有）)

这意味着文件跟踪会跨多次上下文压缩或嵌套分支摘要累积，保留读取和修改文件的完整历史。

### BranchSummaryEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: "branch_summary";
  id: string;
  parentId: string;
  timestamp: number;
  summary: string;
  fromId: string; // Entry we navigated from
  fromHook?: boolean; // true if provided by extension (legacy field name)
  details?: T; // implementation-specific data
}

// Default branch summarization uses this for details (from branch-summarization.ts):
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

与上下文压缩相同，扩展可以在 `details` 中存储自定义数据。

实现参见 [`collectEntriesForBranchSummary()`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、[`prepareBranchEntries()`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) 和 [`generateBranchSummary()`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)。

## 摘要格式

上下文压缩和分支摘要使用相同的结构化格式：

```markdown
## Goal

[What the user is trying to accomplish]

## Constraints & Preferences

- [Requirements mentioned by user]

## Progress

### Done

- [x] [Completed tasks]

### In Progress

- [ ] [Current work]

### Blocked

- [Issues, if any]

## Key Decisions

- **[Decision]**: [Rationale]

## Next Steps

1. [What should happen next]

## Critical Context

- [Data needed to continue]

<read-files>
path/to/file1.ts
path/to/file2.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### 消息序列化

在摘要之前，消息会通过 [`serializeConversation()`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/compaction/utils.ts) 序列化为文本：

```
[User]: What they said
[Assistant thinking]: Internal reasoning
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

这可以防止模型将其视为需要继续的对话。

工具结果在序列化时会被截断为 2000 个字符。超出该限制的内容将被替换为一个标记，指示被截断的字符数。这使摘要请求保持在合理的 token 预算内，因为工具结果(尤其是来自 `read` 和 `bash` 的结果)通常是上下文大小的最大贡献者。

## 通过扩展进行自定义摘要

扩展可以拦截并自定义上下文压缩和分支摘要。有关事件类型定义，请参阅 [`extensions/types.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/extensions/types.ts)。

### 会话_before_compact

在 auto-compaction 或 `/compact` 之前触发。可以取消或提供自定义摘要。请参见类型文件中的 `SessionBeforeCompactEvent` 和 `CompactionPreparation`。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - messages to summarize
  // preparation.turnPrefixMessages - split turn prefix (if isSplitTurn)
  // preparation.previousSummary - previous compaction summary
  // preparation.fileOps - extracted file operations
  // preparation.tokensBefore - context tokens before compaction
  // preparation.firstKeptEntryId - where kept messages start
  // preparation.settings - compaction settings

  // branchEntries - all entries on current branch (for custom state)
  // reason - "manual" (/compact), "threshold", or "overflow"
  // willRetry - whether the aborted turn is retried after compaction (overflow recovery)
  // signal - AbortSignal (pass to LLM calls)

  // Cancel:
  return { cancel: true };

  // Custom summary:
  return {
    compaction: {
      summary: "Your summary...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      details: {/* custom data */}
    }
  };
});
```

#### 将消息转换为文本

要使用自己的模型生成摘要，请使用 `serializeConversation` 将消息转换为文本：

```typescript
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;

  // Convert AgentMessage[] to Message[], then serialize to text
  const conversationText = serializeConversation(convertToLlm(preparation.messagesToSummarize));
  // Returns:
  // [User]: message text
  // [Assistant thinking]: thinking content
  // [Assistant]: response text
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: output text

  // Now send to your model for summarization
  const summary = await myModel.summarize(conversationText);

  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore
    }
  };
});
```

有关使用不同模型的完整示例，请参阅 [custom-compaction.ts](../examples/extensions/custom-compaction.ts)。

### 会话_before_tree

在 `/tree` 导航之前触发。无论用户是否选择摘要，始终触发。可以取消导航或提供自定义摘要。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId - where we're navigating to
  // preparation.oldLeafId - current position (being abandoned)
  // preparation.commonAncestorId - shared ancestor
  // preparation.entriesToSummarize - entries that would be summarized
  // preparation.userWantsSummary - whether user chose to summarize

  // Cancel navigation entirely:
  return { cancel: true };

  // Provide custom summary (only used if userWantsSummary is true):
  if (preparation.userWantsSummary) {
    return {
      summary: {
        summary: "Your summary...",
        details: {/* custom data */}
      }
    };
  }
});
```

请参阅类型文件中的 `SessionBeforeTreeEvent` 和 `TreePreparation`。

## 设置

在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置上下文压缩：

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 设置项             | 默认值  | 描述                        |
| ------------------ | ------- | --------------------------- |
| `enabled`          | `true`  | 启用 auto-compaction        |
| `reserveTokens`    | `16384` | 为 LLM 响应保留的 token 数  |
| `keepRecentTokens` | `20000` | 保留的最近令牌 (不进行摘要) |

使用 `"enabled": false` 禁用 auto-compaction。您仍然可以通过 `/compact` 手动压缩。
