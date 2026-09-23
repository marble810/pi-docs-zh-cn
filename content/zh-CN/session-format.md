# 会话文件格式｜会话 File Format

会话以 JSONL (JSON Lines) 文件形式存储。每一行都是一个带有 `type` 字段的 JSON 对象。会话条目通过 `id`/`parentId` 字段形成树结构，从而支持 in-place 分支而无需创建新文件。

有关以编程方式创建、持久化和进行树导航的内容，请参阅 [`SessionManager` API](sdk.md#sessionmanager-api)。


## 文件位置｜ File Location

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl
```

默认情况下，`<session-id>` 是一个 UUID。调用方可以通过 SDK 或 `--session-id` 提供自定义 ID。对于 `<path>`，Pi 会移除开头的路径分隔符，并将 `/`、`\\` 和 `:` 替换为 `-`。

## 删除会话｜ Deleting Sessions

可以通过删除 `~/.pi/agent/sessions/` 下的 `.jsonl` 文件来移除会话。

Pi 还支持在 `/resume` 中交互式删除会话 (选择一个会话并按 `Ctrl+D`，然后确认)。在可用时， pi 会使用 `trash` CLI 来避免永久删除。

## 会话版本｜会话 Version

会话在头部有一个版本字段：

- **Version 1**：线性条目序列 (legacy ，加载时 auto-migrated)
- **Version 2**：通过 `id`/`parentId` 链接的树结构
- **Version 3**：将 `hookMessage` 角色重命名为 `custom` (扩展统一)

现有会话在加载时会自动迁移到当前版本 (v3)。

## 源文件｜ Source Files

GitHub 上的源代码 ([pi](https://github.com/earendil-works/pi))：
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - 会话条目类型和 SessionManager
- [Message Types](message-types.md) - 共享消息和 content-block 引用
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) - 扩展消息类型
- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) - 基础消息和 content-block 类型
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) - 可扩展的 `AgentMessage` 联合类型

要查看项目中的 TypeScript 定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/` 和 `node_modules/@earendil-works/pi-ai/dist/`。

## 消息｜ Messages

一个 `message` 条目存储一个 [`AgentMessage`](message-types.md)。消息内容块、角色、用量和消息时间戳定义在 [Message Types](message-types.md) 中。

会话条目的时间戳是 ISO 8601 字符串。嵌套消息的时间戳是 Unix 毫秒时间戳。

## 条目基础｜ Entry Base

所有条目(除 `SessionHeader`) 外都扩展自 `SessionEntryBase`：

```typescript
interface SessionEntryBase {
  type: string;
  id: string;           // Usually an 8-char hex ID; may fall back to a full UUID
  parentId: string | null;  // Parent entry ID (null for a root entry)
  timestamp: string;    // ISO timestamp
}
```

## 条目类型｜ Entry Types

### SessionHeader

文件的第一行。仅包含元数据，不属于树的一部分(没有 `id`/`parentId`)。

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project"}
```

对于通过 `/fork`、`/clone` 或 `newSession({ parentSession })` 创建的带有父级的会话()：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project","parentSession":"/path/to/original/session.jsonl"}
```

### SessionMessageEntry

对话中的一条消息。`message` 字段包含一个 `AgentMessage`。系统消息携带提示词和工具配置：会话的第一次请求会持久化一条包含所有提示词部分和工具声明的系统消息，之后的变更会持久化为系统消息，通过名称修补 `sections`(`null` 移除一个)，并通过列表 `toolsAdded`/`toolsRemoved`。按顺序重放它们即可得到当前的提示词和工具；不存在单独的提示词状态条目。

```json
{"type":"message","id":"a0b1c2d3","parentId":null,"timestamp":"2024-12-03T14:00:00.000Z","message":{"role":"system","content":"","sections":{"preamble":"You are an expert coding assistant...","tools":"<tools>\n- read: ...\n</tools>","cwd":"/project"},"toolsAdded":[{"name":"read","description":"...","parameters":{}}],"timestamp":1733234400000}}
{"type":"message","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:04:00.000Z","message":{"role":"system","content":"","sections":{"skills":"<skills>...</skills>"},"toolsRemoved":[{"name":"write"}],"timestamp":1733234640000}}
```

在系统消息出现之前创建的会话没有开头的系统消息；第一次请求会将当前提示词声明为后续的系统消息，其重放方式相同。

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"2024-12-03T14:00:01.000Z","message":{"role":"user","content":"Hello","timestamp":1733234401000}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"api":"anthropic-messages","provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop","timestamp":1733234402000}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"2024-12-03T14:00:03.000Z","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false,"timestamp":1733234403000}}
```

### ModelChangeEntry

当用户切换模型时发出 mid-session。

```json
{"type":"model_change","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:05:00.000Z","provider":"openai","modelId":"gpt-4o"}
```

### ThinkingLevelChangeEntry

当用户更改思考/推理级别时发出。

```json
{"type":"thinking_level_change","id":"e5f6g7h8","parentId":"d4e5f6g7","timestamp":"2024-12-03T14:06:00.000Z","thinkingLevel":"high"}
```

### UsageEntry

记录不属于助手消息且不参与 LLM 上下文的 model-attributed 用量。`kind` 是标识该操作的任意字符串；例如，缓存预热使用 `"cache_warm"`。

```json
{"type":"usage","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:08:00.000Z","kind":"cache_warm","provider":"anthropic","model":"claude-sonnet-4-5","usage":{"input":0,"output":0,"cacheRead":50000,"cacheWrite":0,"totalTokens":50000,"cost":{"input":0,"output":0,"cacheRead":0.015,"cacheWrite":0,"total":0.015}}}
```

用量条目会计入会话的 token 和成本总计。Pi 会将其从对话树中隐藏。消费者应将未知的 `kind` 值视为正常用量，而不是拒绝它们。

### CompactionEntry

在上下文被压缩时创建。存储较早消息的摘要以及完整的系统提示词/工具检查点。

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:10:00.000Z","summary":"User discussed X, Y, Z...","firstKeptEntryId":"c3d4e5f6","tokensBefore":50000,"systemMessage":{"role":"system","content":"You are a coding assistant.","toolsAdded":[],"timestamp":1733235000000}}
```

`firstKeptEntryId` 是必需的。它标识从压缩条目之前保留的第一个条目。重建上下文时，Pi 会用压缩摘要替换较早的已摘要条目，并保留从该条目开始的区间。retain-none 压缩会在该字段中存储自己的 ID ，因此不会保留任何之前的条目。

可选字段：
- `systemMessage`：压缩边界处重放的提示词部分和工具声明；它成为压缩后上下文的前导系统消息，保留条目中的系统消息会因它而被丢弃。在较早的会话条目中不存在。
- `usage`：生成摘要所用的 LLM 用量；计入会话 token 和成本总计
- `details`：实现特定的数据 (e.g。，默认使用 `{ readFiles: string[], modifiedFiles: string[] }`，或为扩展使用自定义数据)
- `fromHook`：如果由扩展生成则为 `true`，如果 pi-generated (旧字段名) 则为 `false`/`undefined`

### ContextEditEntry

对某个较早的 context-producing 条目进行仅追加编辑。它只更改未来的模型上下文；目标条目及其元数据在原始历史、UI、导出和会话核算中保持不变。

```json
{"type":"context_edit","id":"g6h7i8j9","parentId":"f6g7h8i9","timestamp":"2024-12-03T14:11:00.000Z","targetId":"c3d4e5f6","replacement":null}
```

目标可以是 user、assistant、tool-result 或 custom-message 条目。`replacement: null` 会从模型上下文中省略目标。non-null `replacement` 仅替换目标消息内容。针对 assistant 和 tool-result 条目的字符串替换会被规范化为一个文本块，因为这些角色要求内容数组。如果多个编辑针对同一条目，则活动分支上最新的编辑生效。编辑是 branch-relative：导航到编辑之前的某个点会再次显示目标的原始贡献。

### BranchSummaryEntry

通过 `/tree` 切换分支时创建，并带有对左分支直到共同祖先的 LLM 生成摘要。捕获来自被放弃路径的上下文。

```json
{"type":"branch_summary","id":"g7h8i9j0","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:15:00.000Z","fromId":"f6g7h8i9","summary":"Branch explored approach A..."}
```

`parentId` 是新分支继续所依据的条目。`fromId` 是其被放弃路径已被摘要的前一个叶子。

可选字段：
- `usage`：生成摘要所用的 LLM 用量；计入会话 token 和成本总计
- `details`：文件跟踪数据 (`{ readFiles: string[], modifiedFiles: string[] }`)，默认使用该值，或为扩展使用自定义数据
- `fromHook`：如果由扩展生成则为 `true`，如果 pi-generated (旧字段名) 则为 `false`/`undefined`

### CustomEntry

扩展状态持久化。NOT 是否参与 LLM 上下文。

```json
{"type":"custom","id":"h8i9j0k1","parentId":"g7h8i9j0","timestamp":"2024-12-03T14:20:00.000Z","customType":"my-extension","data":{"count":42}}
```

使用 `customType` 在重新加载时标识你的扩展的条目。交互模式可以通过 `pi.registerEntryRenderer(customType, renderer)` 渲染自定义条目，但它们仍然不参与 LLM 上下文。

### CustomMessageEntry

由扩展注入的、确实参与 LLM 上下文的消息。

```json
{"type":"custom_message","id":"i9j0k1l2","parentId":"h8i9j0k1","timestamp":"2024-12-03T14:25:00.000Z","customType":"my-extension","content":"Injected context...","display":true}
```

字段：
- `content`：字符串或 `(TextContent | ImageContent)[]` (与 UserMessage 相同)
- `display`：`true` = 在 TUI 中以独特样式显示，`false` = 隐藏
- `details`：可选的 extension-specific 元数据 (不会发送到 LLM)

### LabelEntry

条目上的用户自定义书签/标记。

```json
{"type":"label","id":"j0k1l2m3","parentId":"i9j0k1l2","timestamp":"2024-12-03T14:30:00.000Z","targetId":"a1b2c3d4","label":"checkpoint-1"}
```

将 `label` 设置为 `undefined` 以清除标签。

### SessionInfoEntry

会话元数据 (e.g。，user-defined 显示名称)。通过 `/name`、`--name` / `-n` 或扩展中的 `pi.setSessionName()` 设置。

```json
{"type":"session_info","id":"k1l2m3n4","parentId":"j0k1l2m3","timestamp":"2024-12-03T14:35:00.000Z","name":"Refactor auth module"}
```

设置后，会话名称会显示在会话选择器 (`/resume`) 中，而不是显示第一条消息。

## 树结构｜ Tree Structure

条目通常形成一棵树，但导航 API 可以创建多个根：
- 根条目具有 `parentId: null`；第一个条目最初是根
- 每个 non-root 条目通过 `parentId` 指向其父条目
- 分支会从较早的条目创建新的子条目
- “叶子”是树中的当前位置
- 调用 `resetLeaf()` 或 `branchWithSummary(null, ...)` 允许后续条目成为另一个根

```
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← current leaf
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← alternate branch
```

## 上下文构建｜ Context Building

`buildContextEntries()` 从当前叶子遍历到根，在遵循上下文压缩的同时生成活动条目列表：

1. 收集路径上的所有条目
2. 如果路径上有一个或多个 `CompactionEntry` 值，则使用最新的一个：
   - 首先包含上下文压缩条目
   - 包含从 `firstKeptEntryId` 到上下文压缩条目（不包括该条目）的 non-system 条目
   - 包含上下文压缩条目之后的条目
3. 保留所选范围内的 non-message 条目，以便交互模式可以渲染它们

`buildSessionProjection()` 然后为每个选定的目标应用最新的 `context_edit`。它返回 model-visible 消息及其 source entries.。省略的目标不会产生消息；替换会保留 source entry 的角色和元数据，仅更改内容。原始选定的条目不会被修改。

`buildSessionContext()` 在该投影的基础上构建，以生成 LLM 的消息列表：

1. 从完整路径中提取当前模型和思考级别设置
2. 将选定的条目转换为消息：
   - `message` -> 存储的 `AgentMessage`
   - `compaction` -> 完整的系统检查点，后跟 `compactionSummary`
   - `branch_summary` -> `branchSummary`
   - `custom_message` -> `CustomMessage`
   - `context_edit` -> 没有自己的上下文消息
   - `usage` 和 `custom` -> 没有上下文消息

上下文压缩摘要会替换 `firstKeptEntryId` 之前的条目。压缩前的系统消息会被折叠到完整检查点中，而不是从保留范围中重放。保留的 non-system 条目以及上下文压缩之后的所有条目仍可供 LLM 使用。

## 解析示例｜ Parsing Example

```typescript
import { readFileSync } from "fs";

const lines = readFileSync("session.jsonl", "utf8").trim().split("\n");

for (const line of lines) {
  const entry = JSON.parse(line);

  switch (entry.type) {
    case "session":
      console.log(`Session v${entry.version ?? 1}: ${entry.id}`);
      break;
    case "message":
      console.log(`[${entry.id}] ${entry.message.role}: ${JSON.stringify(entry.message.content)}`);
      break;
    case "compaction":
      console.log(`[${entry.id}] Compaction: ${entry.tokensBefore} tokens summarized`);
      break;
    case "branch_summary":
      console.log(`[${entry.id}] Branch from ${entry.fromId}`);
      break;
    case "usage":
      console.log(`[${entry.id}] Usage (${entry.kind}): ${entry.usage.totalTokens} tokens`);
      break;
    case "custom":
      console.log(`[${entry.id}] Custom (${entry.customType}): ${JSON.stringify(entry.data)}`);
      break;
    case "custom_message":
      console.log(`[${entry.id}] Extension message (${entry.customType}): ${entry.content}`);
      break;
    case "label":
      console.log(`[${entry.id}] Label "${entry.label}" on ${entry.targetId}`);
      break;
    case "model_change":
      console.log(`[${entry.id}] Model: ${entry.provider}/${entry.modelId}`);
      break;
    case "thinking_level_change":
      console.log(`[${entry.id}] Thinking: ${entry.thinkingLevel}`);
      break;
  }
}
```
