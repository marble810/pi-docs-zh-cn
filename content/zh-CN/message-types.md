# 消息类型｜ Message Types

Pi 在 SDK 状态、生命周期事件、RPC 响应以及持久化的会话消息条目中使用 `AgentMessage` 值。本页定义这些共享消息及其内容块。

消息时间戳是 Unix 毫秒时间戳。它们不同于 [会话 条目](session-format.md#entry-base) 上的 ISO 8601 时间戳。

源定义：

- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) 定义了 provider-facing 消息和内容块。
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) 定义了可扩展的 `AgentMessage` 联合类型。
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) 添加了 coding-agent 消息角色。

## 内容块｜ Content blocks

### TextContent

```typescript
interface TextContent {
  type: "text";
  text: string;
  textSignature?: string;
}
```

`textSignature` 包含 provider-specific 消息元数据。请将其视为不透明数据。

### ImageContent

```typescript
interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}
```

`data` 是 base64 编码的图像数据。`mimeType` 标识其媒体类型，例如 `image/png` 或 `image/jpeg`。

### ThinkingContent

```typescript
interface ThinkingContent {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
}
```

思考签名包含 provider-specific 重放数据。请将其视为不透明数据。被脱敏的块可能没有可见的思考文本，但在 `thinkingSignature` 中保留了加密载荷。

### ToolCall

```typescript
interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
  thoughtSignature?: string;
  namespace?: string;
}
```

`thoughtSignature` 是 provider-specific。`namespace` 为动态加载或带命名空间的工具标识一个 OpenAI Responses 命名空间。

## 用量｜ Usage

助手消息始终包含用量。当工具执行了嵌套模型工作时，工具结果可以包含用量。

```typescript
interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  reasoning?: number;
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

当存在时，`reasoning` 已包含在 `output` 中；请勿再次添加。`cacheWrite1h` 是 `cacheWrite` 中以 one-hour 保留策略写入的子集。

## 基础消息｜ Base messages

### SystemMessage

```typescript
interface SystemMessage {
  role: "system";
  content: string | TextContent[];
  sections?: Record<string, string | null>;
  toolsAdded?: Tool[];
  toolsRemoved?: ToolReference[];
  replace?: boolean;
  timestamp: number;
}
```

开头的系统消息声明了初始提示词和工具。后续系统消息可以追加指令、替换或移除命名的提示词部分，以及添加或移除工具。按顺序重放它们即可得到当前状态。带有 `replace: true` 的消息会丢弃先前的状态并建立一个完整的新基线。

### UserMessage

```typescript
interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}
```

### AssistantMessage

```typescript
interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  providerThinkingLevel?: string;
  diagnostics?: AssistantMessageDiagnostic[];
  usage: Usage;
  stopReason: "pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred";
  deferred?: DeferredHandle;
  errorMessage?: string;
  rawStopReason?: string;
  endTurn?: boolean;
  timestamp: number;
}
```

当具体模型提供商响应模型与请求的模型不同时，`responseModel` 会记录该响应模型。`responseId`、`providerThinkingLevel`、`diagnostics` 和 `rawStopReason` 保留模型提供商或运行时细节。

`"pending"` 用于流式传输期间的部分助手消息。`message_end` 中已完成的消息具有终止停止原因，并且 Pi 不会在会话 JSONL 中持久化 `"pending"` 助手消息。

`"deferred"` 响应带有一个 `DeferredHandle`，其中包含检索它所需的模型提供商数据：

```typescript
interface DeferredHandle {
  provider: string;
  modelId: string;
  api: string;
  id: string;
  expiresAt?: number;
  pollAfterMs?: number;
  data?: JsonValue;
}
```

### ToolResultMessage

```typescript
interface ToolResultMessage<TDetails = any> {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: TDetails;
  usage?: Usage;
  isError: boolean;
  timestamp: number;
}
```

`details` 是 tool-specific。可选的 `usage` 报告工具执行的嵌套模型工作，并计入 full-session 统计信息，但它不属于主要的 model-call 用量。

## 编程代理消息｜ Coding-代理 messages

coding-agent 包通过四种角色扩展了 `AgentMessage`。

### BashExecutionMessage

由直接的 shell 命令创建，包括 RPC [`bash`](rpc-commands.md#bash) 命令。它不是 LLM 工具结果。

```typescript
interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
  timestamp: number;
}
```

除非 `excludeFromContext` 为 true ，否则 Pi 会在下一次模型请求之前将此消息转换为 user-role 文本。

### CustomMessage

当扩展发送上下文消息时创建。

```typescript
interface CustomMessage<T = unknown> {
  role: "custom";
  customType: string;
  content: string | (TextContent | ImageContent)[];
  display: boolean;
  details?: T;
  timestamp: number;
}
```

Pi 将其内容转换为用户消息以用于模型请求。`display` 控制终端渲染；`details` 不会发送给模型。

### BranchSummaryMessage

```typescript
interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string | null;
  timestamp: number;
}
```

Pi 从持久化的 `branch_summary` 条目创建此上下文消息。

### CompactionSummaryMessage

```typescript
interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

Pi 从持久化的 `compaction` 条目创建此上下文消息。

## AgentMessage 联合类型

在编程代理中，该联合类型等价于：

```typescript
type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

在 lower-level 代理包中，`AgentMessage` 是 `Message | CustomAgentMessages[keyof CustomAgentMessages]`。应用程序可以通过 TypeScript 声明合并来添加角色，因此当消费者接受来自增强宿主的消息时，应容忍未知的自定义角色。
