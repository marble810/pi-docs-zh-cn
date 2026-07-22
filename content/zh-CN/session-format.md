# 会话文件格式｜会话 File Format

会话存储为 JSONL (JSON Lines) 文件。每行是一个包含 `type` 字段的 JSON 对象。会话条目通过 `id`/`parentId` 字段形成树结构，从而实现 in-place 分支，无需创建新文件。

## 文件位置｜ File Location

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

其中 `<path>` 是工作目录，`/` 被替换为 `-`。

## 删除会话｜ Deleting Sessions

可以通过删除 `~/.pi/agent/sessions/` 下的 `.jsonl` 文件来移除会话。

Pi 还支持通过 `/resume` 交互式删除会话：(选择一个会话并按 `Ctrl+D`，然后确认)。如果可用， pi 会使用 `trash` CLI 来避免永久删除。

## 会话版本｜会话 Version

会话在头部有一个版本字段：

- **版本 1**：线性条目序列 (旧版，加载时 auto-migrated)
- **版本 2**：树结构，带有 `id`/`parentId` 链接
- **版本 3**: 将`hookMessage`角色重命名为`custom` (扩展统一)

现有会话在加载时会自动迁移到当前版本 (v3)。

## 源文件｜ Source Files

源代码位于 GitHub ([pi-mono](https://github.com/earendil-works/pi-mono))：
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/session-manager.ts) - 会话条目类型和 SessionManager
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/messages.ts) - 扩展消息类型 (BashExecutionMessage、CustomMessage 等)
- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/types.ts) - 基本消息类型 (UserMessage、AssistantMessage、ToolResultMessage)
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/agent/src/types.ts) - AgentMessage 联合类型

要查看项目中的 TypeScript 定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/` 和 `node_modules/@earendil-works/pi-ai/dist/`。

## 消息类型｜ Message Types

会话条目包含 `AgentMessage` 对象。理解这些类型对于解析会话和编写扩展至关重要。

### 内容块｜ Content Blocks

消息包含类型化内容块的数组：

```typescript
interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image";
  data: string;      // base64 encoded
  mimeType: string;  // e.g., "image/jpeg", "image/png"
}

interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

### 基本消息类型 (来自 pi-ai)

```typescript
interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;  // Unix ms
}

interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: "stop" | "length" | "toolUse" | "error" | "aborted";
  errorMessage?: string;
  timestamp: number;
}

interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: any;      // Tool-specific metadata
  usage?: Usage;      // Nested LLM work performed by the tool
  isError: boolean;
  timestamp: number;
}

interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}
```

### 扩展消息类型 (来自 pi-coding-agent)

```typescript
interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;  // true for !! prefix commands
  timestamp: number;
}

interface CustomMessage {
  role: "custom";
  customType: string;            // Extension identifier
  content: string | (TextContent | ImageContent)[];
  display: boolean;              // Show in TUI
  details?: any;                 // Extension-specific metadata
  timestamp: number;
}

interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;                // Entry we branched from
  timestamp: number;
}

interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

### AgentMessage 联合

```typescript
type AgentMessage =
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

## 条目基类｜ Entry Base

所有条目（(除 `SessionHeader` 外)）都扩展自 `SessionEntryBase`：

```typescript
interface SessionEntryBase {
  type: string;
  id: string;           // 8-char hex ID
  parentId: string | null;  // Parent entry ID (null for first entry)
  timestamp: string;    // ISO timestamp
}
```

## 条目类型｜ Entry Types

### SessionHeader

文件的第一行。仅元数据，不属于树结构 (无 `id`/`parentId`)。

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project"}
```

对于具有父会话的会话（(通过 `/fork`、`/clone` 或 `newSession({ parentSession })` 创建)）：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project","parentSession":"/path/to/original/session.jsonl"}
```

### SessionMessageEntry

对话中的一条消息。`message` 字段包含一个 `AgentMessage`。

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"2024-12-03T14:00:01.000Z","message":{"role":"user","content":"Hello"}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop"}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"2024-12-03T14:00:03.000Z","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false}}
```

### ModelChangeEntry

当用户切换模型时触发 mid-session。

```json
{"type":"model_change","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:05:00.000Z","provider":"openai","modelId":"gpt-4o"}
```

### ThinkingLevelChangeEntry

当用户更改思考/推理级别时触发。

```json
{"type":"thinking_level_change","id":"e5f6g7h8","parentId":"d4e5f6g7","timestamp":"2024-12-03T14:06:00.000Z","thinkingLevel":"high"}
```

### CompactionEntry

当上下文被压缩时创建。存储早期消息的摘要。

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:10:00.000Z","summary":"User discussed X, Y, Z...","firstKeptEntryId":"c3d4e5f6","tokensBefore":50000}
```

较新的 harness-generated 压缩将保留的 post-compaction 上下文直接嵌入到条目中，而不是使用 `firstKeptEntryId`：

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:10:00.000Z","summary":"User discussed X, Y, Z...","tokensBefore":50000,"retainedTail":[{"role":"user","content":"latest request"},{"role":"assistant","content":[{"type":"text","text":"latest reply"}],"provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop"}]}
```

可选字段：
- `usage`：生成摘要时的 LLM 使用量；包含在会话令牌和成本总计中
- `retainedTail`：压缩后保留的具体 `AgentMessage[]`。此字段仅对旧会话的后向兼容性为可选。较新的 harness-generated 压缩包含此字段，以便我们可以从此检查点重建上下文，而无需遍历压缩条目之前的旧条目。
- `details`：实现特定的数据 (e.g.，默认情况下为 `{ readFiles: string[], modifiedFiles: string[] }`，或扩展的自定义数据)
- `fromHook`：如果由扩展生成则为 `true`，如果是 pi-generated 则为 `false`/`undefined` (旧字段名称)
- `firstKeptEntryId`：用于与旧条目格式兼容。

### BranchSummaryEntry

当通过 `/tree` 切换分支并带有 LLM 生成的左分支直至共同祖先的摘要时创建。捕获已放弃路径的上下文。

```json
{"type":"branch_summary","id":"g7h8i9j0","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:15:00.000Z","fromId":"f6g7h8i9","summary":"Branch explored approach A..."}
```

可选字段：
- `usage`：生成摘要时的 LLM 使用量；包含在会话令牌和成本总计中
- `details`：文件跟踪数据 (`{ readFiles: string[], modifiedFiles: string[] }`) 默认情况下，或扩展的自定义数据
- `fromHook`：如果由扩展生成则为 `true`，如果是 pi-generated 则为 `false`/`undefined` (旧字段名称)

### CustomEntry

扩展状态持久化。NOT 不参与 LLM 上下文。

```json
{"type":"custom","id":"h8i9j0k1","parentId":"g7h8i9j0","timestamp":"2024-12-03T14:20:00.000Z","customType":"my-extension","data":{"count":42}}
```

使用 `customType` 在重新加载时标识扩展的条目。交互模式可以通过 `pi.registerEntryRenderer(customType, renderer)` 渲染自定义条目，但它们仍然不参与 LLM 上下文。

### CustomMessageEntry

扩展注入的消息确实参与 LLM 上下文。

```json
{"type":"custom_message","id":"i9j0k1l2","parentId":"h8i9j0k1","timestamp":"2024-12-03T14:25:00.000Z","customType":"my-extension","content":"Injected context...","display":true}
```

字段：
- `content`：字符串或`(TextContent | ImageContent)[]` (与UserMessage相同)
- `display`：`true` = 在TUI中以独特样式显示，`false` = 隐藏
- `details`：可选的extension-specific元数据 (不发送到LLM)

### LabelEntry

条目上的用户定义书签/标记。

```json
{"type":"label","id":"j0k1l2m3","parentId":"i9j0k1l2","timestamp":"2024-12-03T14:30:00.000Z","targetId":"a1b2c3d4","label":"checkpoint-1"}
```

将`label`设置为`undefined`以清除标签。

### SessionInfoEntry

会话元数据(e.g。，user-defined显示名称)。通过扩展中的`/name`、`--name`/`-n`或`pi.setSessionName()`设置。

```json
{"type":"session_info","id":"k1l2m3n4","parentId":"j0k1l2m3","timestamp":"2024-12-03T14:35:00.000Z","name":"Refactor auth module"}
```

设置后，会话名称将显示在会话选择器(`/resume`)中，而不是第一条消息。

## 树形结构

条目形成一棵树：
- 第一条条目具有`parentId: null`
- 后续每条条目通过`parentId`指向其父条目
- 分支从较早的条目创建新的子条目
- "leaf"是树中的当前位置

```
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← current leaf
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← alternate branch
```

## 上下文构建

`buildContextEntries()`从当前叶子节点向上遍历到根节点，生成活动条目列表，同时遵循上下文压缩：

1. 收集路径上的所有条目
2. 如果路径上存在`CompactionEntry`：
   - 首先包含上下文压缩条目
   - 如果存在`retainedTail`，则其充当self-contained检查点，并包含上下文压缩之后的条目
   - 否则包含从`firstKeptEntryId`到上下文压缩的条目
   - 然后包含上下文压缩之后的条目
3. 在选定范围内保留non-message条目，以便交互模式可以渲染它们

`buildSessionContext()`基于该条目列表为LLM生成消息列表：

1. 从完整路径中提取当前模型和思考级别设置
2. 将选定条目转换为消息：
   - `message` -> 存储的`AgentMessage`
   - `compaction` -> `compactionSummary`加上`retainedTail`（如果存在）
   - `branch_summary` -> `branchSummary`
   - `custom_message` -> `CustomMessage`
   - `custom` -> 无上下文消息

这使得较新的上下文压缩表现得像 self-contained 检查点。`retainedTail` 是可选的，仅为了使只存储 `firstKeptEntryId` 的旧会话能正确加载。

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

## SessionManager API

用于以编程方式处理会话的关键方法。

### 静态创建方法｜ Static Creation Methods
- `SessionManager.create(cwd, sessionDir?)` - 新建会话
- `SessionManager.open(path, sessionDir?)` - 打开现有会话文件
- `SessionManager.continueRecent(cwd, sessionDir?)` - 继续最近的会话或新建
- `SessionManager.inMemory(cwd?)` - 无文件持久化
- `SessionManager.forkFrom(sourcePath, targetCwd, sessionDir?)` - 从其他项目派生会话

### 静态列出方法｜ Static Listing Methods
- `SessionManager.list(cwd, sessionDir?, onProgress?)` - 列出目录的会话
- `SessionManager.listAll(onProgress?)` - 列出所有项目中的所有会话

### 实例方法 - 会话管理｜ Instance Methods - 会话 Management
- `newSession(options?)` - 新建会话 (选项：`{ parentSession?: string }`)
- `setSessionFile(path)` - 切换到其他会话文件
- `createBranchedSession(leafId)` - 将分支提取到新会话文件

### 实例方法 - 追加 (均返回条目 ID)
- `appendMessage(message)` - 添加消息
- `appendThinkingLevelChange(level)` - 记录思考变化
- `appendModelChange(provider, modelId)` - 记录模型变化
- `appendCompaction(summary, firstKeptEntryId, tokensBefore, details?, fromHook?)` - 添加上下文压缩
- `appendCustomEntry(customType, data?)` - 扩展状态 (不在上下文中)
- `appendSessionInfo(name)` - 设置会话显示名称
- `appendCustomMessageEntry(customType, content, display, details?)` - 扩展消息(在上下文中)
- `appendLabelChange(targetId, label)` - 设置/清除标签

### 实例方法 - 树导航
- `getLeafId()` - 当前位置
- `getLeafEntry()` - 获取当前叶子条目
- `getEntry(id)` - 通过 ID 获取条目
- `getBranch(fromId?)` - 从条目遍历到根节点
- `getTree()` - 获取完整树结构
- `getChildren(parentId)` - 获取直接子节点
- `getLabel(id)` - 获取条目标签
- `branch(entryId)` - 将叶子移动到更早的条目
- `resetLeaf()` - 将叶子重置为 null(在任何条目之前)
- `branchWithSummary(entryId, summary, details?, fromHook?)` - 带有上下文摘要的分支

### 实例方法 - 上下文与信息
- `buildContextEntries()` - 获取应用了上下文压缩后的活动分支条目
- `buildSessionContext()` - 获取消息、thinkingLevel和用于LLM的模型
- `getEntries()` - 所有条目(不包括头部)
- `getHeader()` - 会话头部元数据
- `getSessionName()` - 从最新会话_信息条目获取显示名称
- `getCwd()` - 工作目录
- `getSessionDir()` - 会话存储目录
- `getSessionId()` - 会话UUID
- `getSessionFile()` - 会话文件路径(对于in-memory为 undefined)
- `isPersisted()` - 会话是否已保存到磁盘
