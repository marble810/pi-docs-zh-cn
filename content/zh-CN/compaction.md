# 上下文压缩参考｜上下文压缩 Reference

本参考文档介绍自动上下文压缩、分支摘要、持久化条目以及扩展钩子。关于用户工作流，请参阅 [会话与上下文](sessions.md#manage-conversation-context)。

**源文件** ([pi](https://github.com/earendil-works/pi))：
- [`packages/coding-agent/src/core/compaction/compaction.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) - 自动上下文压缩逻辑
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) - 分支摘要
- [`packages/coding-agent/src/core/compaction/utils.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) - 共享工具 (文件跟踪、序列化)
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - 条目类型 (`CompactionEntry`、`BranchSummaryEntry`)
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) - 扩展事件类型

要查看项目中 TypeScript 的定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/`。

## 概述｜ Overview

Pi 有两种摘要机制：

| 机制｜ Mechanism | 触发条件｜ Trigger | 用途｜ Purpose |
|-----------|---------|---------|
| 上下文压缩｜上下文压缩 | 上下文超过阈值，或 `/compact` | 摘要旧消息以释放上下文 |
| 分支摘要｜ Branch summarization | `/tree` 导航 | 切换分支时保留上下文 |

两者使用密切相关的结构化格式，并累积跟踪文件操作。摘要请求会禁用 prompt-cache 写入，因为这些 one-off 提示词不太可能被复用。

## 上下文压缩｜上下文压缩

### 触发时机｜ When It Triggers

自动上下文压缩在以下情况触发：

```
contextTokens > contextWindow - reserveTokens
```

默认情况下，`reserveTokens` 为 16384 个 token (可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置)。这为 LLM 的响应留出了空间。

在 multi-turn 代理运行期间，Pi 会在工具执行完毕且其结果被追加之后、开始下一次助手响应之前，检查规范投影上下文。如果越过阈值，Pi 会在 `prepareNextTurn` 期间执行上下文压缩，然后在 `turn_start` 之前执行现有的 catch-up 引导轮询。当已完成的工具批次终止运行且没有排队消息需要另一次响应时，它会跳过此 between-turn 检查。Pi 还会在新用户提示词之前进行检查，并在 low-level 运行结束后执行 final-attempt 溢出恢复。

模型提供商 context-overflow 错误或过早的最终 `stopReason: "length"` 可以选择一次 compact-and-retry 恢复尝试。带有工具调用的长度响应会保留其合成的失败工具结果，并遵循普通的工具/队列调度器，而不是强制结束运行。

你也可以使用 `/compact [instructions]` 手动触发，其中可选指令用于聚焦摘要。

### 工作原理｜ How It Works

1. **查找切点**：在最终确定的会话投影中向后遍历，累积 token 估算值，直到达到 `keepRecentTokens` (默认 20k ，可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置)
2. **提取消息**：从上一个保留边界 (或会话开始) 到切点之间收集投影消息
3. **生成摘要**：调用 LLM 以结构化格式进行摘要，若存在则传入上一个摘要作为迭代上下文
4. **追加条目**：保存带有摘要和 `firstKeptEntryId` 的 `CompactionEntry`
5. **重建上下文**：会话为下一个请求重建上下文，使用摘要 + 从 `firstKeptEntryId` 开始的消息

```
Before compaction:

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               messagesToSummarize            kept messages
                                   ↑
                          firstKeptEntryId (entry 4)

After compaction (new entry appended):

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
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

在重复压缩时，被摘要的跨度从上一个压缩的保留边界 (`firstKeptEntryId`) 开始，而不是从压缩条目本身开始；如果在路径中找不到该保留条目，则回退到上一个压缩之后的条目。retain-none 压缩会将自己的 ID 记录为 `firstKeptEntryId`；重复压缩从该条目之后开始。这样可以将早先压缩中幸存下来的消息保留下来，方法是在下一次摘要处理中也将它们包含进去。Pi 还会在写入新的 `CompactionEntry` 之前，从重建后的 context-edited 会话投影中重新计算 `tokensBefore`，因此 token 计数反映的是被替换的实际 pre-compaction 上下文。被省略的原始条目仍会存储，但不会影响切点选择、摘要、检查点或 token 估算。

### 溢出与长度恢复顺序｜ Overflow and Length Recovery Ordering

恢复会保留现有的生命周期和队列顺序。已完成的尝试对 `turn_end` 和 `agent_end` 仍然可见；post-run 恢复随后会在全新重试之前修复持久化的模型上下文：

```text
persist final assistant response
→ extension/public turn_end
→ extension/public agent_end
→ append context_edit omissions for the selected attempt
→ for overflow/length: run session_before_compact and append compaction on success
→ start the retry as a fresh run
```

如果恢复压缩失败或被取消，Pi 会保留省略编辑，不追加压缩，也不调度内部重试。现有的排队工作仍由普通的引导和 follow-up 规则管理。`agent_before_settle` 在恢复处理之后看到修复后的投影。原始转录历史、导出、计费总计和 history-search 扩展仍可检查被省略的尝试。

### 拆分 user-message 跨度

一个 user-message 跨度以用户消息开始，并包含直到下一个用户消息之前的所有轮次。通常，上下文压缩在 user-message 边界处切割。

当一个 user-message 跨度超过 `keepRecentTokens` 时，切点会落在该跨度内的助手消息处。这是一个拆分的 user-message 跨度：

```
Split user-message span (one span exceeds budget):

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
  messagesToSummarize = []  (no earlier user-message spans)
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

对于拆分的 user-message 跨度，Pi 会生成两个摘要并将它们合并：
1. **历史摘要**：先前的上下文 (如果有)
2. **用户-message-span 前缀摘要**：拆分 user-message 跨度的早期部分

### 切点规则｜ Cut Point Rules

有效的切点为：
- 用户消息
- 助手消息
- BashExecution 消息
- 自定义消息 (custom_message、分支_summary)

绝不在工具结果处切割 (它们必须与其工具调用保持在一起)。

仅当被保留边界推进后的 context-invisible 后缀包含一个被省略的助手尝试且不包含任何未被省略的 context-producing 条目时，准备阶段才会将该边界推进到该后缀中。恢复 `context_edit` 省略项满足此规则；本质上 context-invisible 的元数据可以与其共存。仅元数据以及新追加的自定义消息不会移动切割点。影响候选输入或已摘要前缀的替换编辑也会阻止推进，因为被省略的助手回答了 pre-edit 输入；对最终被省略的后缀条目的替换仍然是安全的。这允许将 over-budget 恢复的输入进行摘要，同时保留使被放弃的尝试保持省略的编辑，而不会让簿记改变新模型输入是否被逐字保留。

### CompactionEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface CompactionEntry<T = unknown> {
  type: "compaction";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  usage?: Usage;       // LLM usage that generated the summary
  fromHook?: boolean;  // true if provided by extension (legacy field name)
  details?: T;         // implementation-specific data
}

// Default compaction uses this for details (from compaction.ts):
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

扩展可以在 `details` 中存储任何可被 JSON 序列化的数据。默认压缩会跟踪文件操作，但自定义扩展实现可以使用自己的结构。生成的和 extension-provided 摘要会在可用时存储其 LLM `usage`，以便会话总计包含摘要工作。

实现请参见 [`prepareCompaction()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) 和 [`compact()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)。对于直接以编程方式进行摘要，`generateSummary()` 返回摘要文本，`generateSummaryWithUsage()` 返回 `{ text, usage }`。

## 分支摘要｜ Branch Summarization

### 触发时机｜ When It Triggers

当你使用 `/tree` 导航到不同分支时，Pi 会提议对你正在离开的工作进行摘要。这会将来自左侧分支的上下文注入到新分支中。

### 工作原理｜ How It Works

1. **查找共同祖先**：按旧位置和新位置取最深的 node shared
2. **收集条目**：从旧叶子回溯到共同祖先
3. **按预算准备**：包含消息直至 token 预算 (最新优先)
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

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [summary of B,C,D] (new leaf)
```

### 累积文件跟踪｜ Cumulative File Tracking

默认压缩和分支摘要会累积跟踪文件。两者都会从正在被摘要的消息中的工具调用里提取文件操作。压缩还会携带来自先前由 Pi 生成的压缩的文件列表。分支摘要会携带来自其所摘要条目中由 Pi 生成的分支摘要的文件列表。

因此，文件跟踪会在默认压缩和嵌套的默认分支摘要之间累积。Pi 不会自动携带来自 extension-generated 摘要的文件列表，这些摘要的 `fromHook` 字段为 `true`；扩展管理自己的 `details` 格式。

### BranchSummaryEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: "branch_summary";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  fromId: string;      // Entry we navigated from
  usage?: Usage;       // LLM usage that generated the summary
  fromHook?: boolean;  // true if provided by extension (legacy field name)
  details?: T;         // implementation-specific data
}

// Default branch summarization uses this for details (from branch-summarization.ts):
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

与压缩相同，扩展可以在 `details` 中存储自定义数据。

实现请参见 [`collectEntriesForBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、[`prepareBranchEntries()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) 和 [`generateBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)。

## 摘要格式｜ Summary Format

两种格式都包含目标、约束与偏好、进展、关键决策和后续步骤。上下文压缩摘要还包含关键上下文。分支摘要到后续步骤为止。Pi 在相关时会将文件列表追加到任一格式中。

上下文压缩摘要使用以下格式：

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

### 消息序列化｜ Message Serialization

在摘要生成之前，消息会通过 [`serializeConversation()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) 序列化为文本：

```
[User]: What they said
[Assistant thinking]: Internal reasoning
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

这可以防止模型将其视为要继续进行的对话。

工具结果在序列化期间会被截断为 2000 个字符。超出该限制的内容会被替换为一个标记，指示截断了多少个字符。这可以将摘要生成请求保持在合理的 token 预算内，因为工具结果(尤其是来自 `read` 和 `bash`) 的工具结果通常是上下文大小的最大贡献者。

## 通过扩展自定义摘要生成｜ Custom Summarization via Extensions

扩展可以拦截并自定义上下文压缩和分支摘要生成。有关事件类型定义，请参阅 [`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)。

### 会话_before_compact

在 auto-compaction 或 `/compact` 之前触发。可以取消或提供自定义摘要。请参阅类型文件中的 `SessionBeforeCompactEvent` 和 `CompactionPreparation`。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - messages to summarize
  // preparation.turnPrefixMessages - user-message-span prefix (if isSplitTurn)
  // preparation.previousSummary - previous compaction summary
  // preparation.fileOps - extracted file operations
  // preparation.tokensBefore - context tokens before compaction
  // preparation.firstKeptEntryId - where kept messages start
  // preparation.settings - effective settings after applying model overrides

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
      // usage: summaryResponse.usage, // Optional; included in session totals
      details: { /* custom data */ },
    }
  };
});
```

#### 将消息转换为文本｜ Converting Messages to Text

要使用你自己的模型生成摘要，请使用 `serializeConversation` 将消息转换为文本：

```typescript
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;
  
  // Convert AgentMessage[] to Message[], then serialize to text
  const conversationText = serializeConversation(
    convertToLlm(preparation.messagesToSummarize)
  );
  // Returns:
  // [User]: message text
  // [Assistant thinking]: thinking content
  // [Assistant]: response text
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: output text

  // Now send to your model for summarization
  const { summary, usage } = await myModel.summarize(conversationText);
  
  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage,
    }
  };
});
```

有关使用不同模型的完整示例，请参阅 [custom-compaction.ts](../examples/extensions/custom-compaction.ts)。

### 会话_compact_failed

在手动或自动上下文压缩失败或被中止时触发。这对于需要将 `session_before_compact` 尝试与最终结果配对的遥测扩展很有用。

```typescript
pi.on("session_compact_failed", async (event, ctx) => {
  const { reason, errorMessage, aborted, willRetry, fromExtension } = event;
  // reason - "manual" (/compact), "threshold", or "overflow"
  // errorMessage - present for non-abort failures
  // aborted - true for canceled/aborted compactions
  // willRetry - whether the aborted turn would have retried after compaction
  // fromExtension - whether extension-provided compaction content was being used
});
```

### 会话_before_tree

在 `/tree` 导航之前触发。无论用户是否选择生成摘要，都会始终触发。可以取消导航或提供自定义摘要。

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
        // usage: summaryResponse.usage, // Optional; included in session totals
        details: { /* custom data */ },
      }
    };
  }
});
```

请参阅类型文件中的 `SessionBeforeTreeEvent` 和 `TreePreparation`。

## 设置｜ Settings

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

| 设置 | 默认值 | 描述 |
|---------|---------|-------------|
| `enabled` | `true` | 启用 auto-compaction |
| `reserveTokens` | `16384` | 为 LLM 响应预留的 token 数 |
| `keepRecentTokens` | `20000` | 保留的近期 token ，(不进行摘要) |

使用 `"enabled": false` 禁用 auto-compaction。你仍然可以使用 `/compact` 手动压缩上下文。

### 按模型覆盖｜ Per-model overrides

使用 `compaction.modelOverrides` 为不同模型调整 token 预算：

```json
{
  "compaction": {
    "reserveTokens": 16384,
    "keepRecentTokens": 20000,
    "modelOverrides": {
      "some-provider/big-model": {
        "reserveTokens": 400000
      }
    }
  }
}
```

对于具有 1M 上下文窗口的模型，此覆盖会在超过 600K token 时触发上下文压缩，并保留通常的 20000 个近期 token。其他模型保留通常的 16384 token 预留量。`reserveTokens` 也会影响摘要输出限制，并受模型最大输出 token 数限制；它不仅仅是触发阈值。

键是精确的 case-sensitive `provider/modelId` 值，包括模型 ID 中的任何斜杠。每个 `reserveTokens` 和 `keepRecentTokens` 值都会独立地从模型覆盖回退到普通设置，再回退到 built-in 默认值。值必须是 non-negative 安全整数。匹配的模型覆盖中的无效值在读取时会产生错误；只有省略的字段才会回退到普通设置。模型覆盖条目必须是对象。无效的普通 token 设置在读取时会产生错误，即使当前活动模型具有有效的覆盖。只有省略的普通值才会使用 built-in 默认值。`enabled` 仍然是全局的，而不是 model-specific。

这些解析后的值用于手动上下文压缩、所有自动阈值检查、溢出恢复以及 extension-visible `preparation.settings`。模型切换会影响后续检查和上下文压缩，但不会更改普通设置。已在进行中的上下文压缩使用该操作捕获的模型和设置。分支摘要设置不受影响。

覆盖在全局和项目设置中都有效。文件在查找前会递归合并，因此全局 model-specific 值优先于 project-wide 回退值；项目必须覆盖该模型条目才能更改它。详情请参阅 [Settings](settings.md#per-model-compaction-overrides)。
