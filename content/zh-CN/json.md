# JSON 事件流｜ Event Stream

JSON 模式为单次调用发出结构化进度：

```bash
pi --mode json "Review this repository"
```

Pi 写入一个会话头，随后是会话事件，然后在提供的提示词完成后退出。RPC 模式发出相同的 session-event 结构，但没有会话头，因为它是一个双向的 long-lived 协议。请参阅 [RPC 模式](rpc.md)。

本页面是 JSON 和 RPC 模式共享事件的规范参考。消息值使用 [共享消息类型](message-types.md)。

## 帧格式与进程 I/O ｜ Framing and process I/O

该流使用严格的 JSONL 帧格式。每条记录是一个以 LF (`\n`) 结尾的 JSON 对象。仅按 LF 拆分记录，并去除可选的前置回车符。Unicode 行分隔符和段落分隔符在 JSON 字符串内是有效的，不是记录边界。

Node.js `readline` 不适用于此流，因为它也会识别那些 Unicode 分隔符。请使用字节或 UTF-8 流解码器，并按 LF 拆分。

持续读取 stdout。当管道缓冲区填满时，停止消费记录的读取器可能会使 Pi 停滞。stdout 保留给 JSONL；诊断信息和应用程序日志输出到 stderr。

## 会话标头｜会话 header

第一条 JSON 模式记录是当前的 [会话标头](session-format.md#sessionheader)：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path"}
```

RPC 模式不会发出此记录。使用 [`get_state`](rpc-commands.md#get_state) 获取其当前会话 ID 和文件。

## 事件序列｜ Event sequence

一次基本运行会产生如下记录：

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_end","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_start","message":{"role":"assistant","content":[],"stopReason":"pending","...":"..."}}
{"type":"message_update","usage":{"...":"..."},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{"role":"assistant","...":"..."}}
{"type":"turn_end","message":{"role":"assistant","...":"..."},"toolResults":[]}
{"type":"agent_end","messages":[{"...":"..."}],"willRetry":false}
{"type":"agent_settled"}
```

`agent_end` 结束一次 low-level 代理运行。自动重试、溢出恢复、上下文压缩重试、引导或 follow-up 工作仍可继续。`agent_settled` 表示 Pi 对该 session-level 运行没有剩余自动工作。

## 代理与轮次事件｜代理 and turn events

| 事件 | 字段 | 含义 |
|---|---|---|
| `agent_start` | 无 | 一次 low-level 代理运行已开始。 |
| `agent_end` | `messages`、`willRetry` | 该 low-level 运行已结束。`messages` 包含该运行生成的消息。 |
| `agent_settled` | 无 | Pi 不会通过重试、上下文压缩恢复或排队消息自动继续。 |
| `turn_start` | 无 | 一次助手轮次已开始。 |
| `turn_end` | `message`、`toolResults` | 一个助手响应及其产生的工具调用已完成。 |

一个轮次是一个助手响应加上该响应产生的所有工具调用和工具结果。

## 消息事件｜ Message events

| 事件｜ Event | 字段｜ Fields | 含义｜ Meaning |
|---|---|---|
| `message_start` | `message` | 一条消息已开始。 |
| `message_update` | `usage`、`assistantMessageEvent` | 一条助手消息发出了 content-block 更新。 |
| `message_end` | `message` | 一条消息已完成。这是权威的最终消息。 |

### 重建流式消息｜ Reconstruct streaming messages

传输中的 `message_update` 记录是 delta-only。它们省略了 SDK 事件的累积 `message` 字段以及每个 `assistantMessageEvent.partial` 快照，因此流的大小保持线性。

嵌套事件是以下之一：

| 类型｜ Type | 除 `type` 之外的字段 | 含义｜ Meaning |
|---|---|---|
| `start` | 无 | 模型提供商的流已开始；其累积 `partial` 字段在传输中被移除。 |
| `text_start` | `contentIndex` | 文本块已开始。 |
| `text_delta` | `contentIndex`, `delta` | 将文本追加到该块。 |
| `text_end` | `contentIndex`, `content` | 文本块以权威内容结束。 |
| `thinking_start` | `contentIndex` | 思考块已开始。 |
| `thinking_delta` | `contentIndex`, `delta` | 将思考文本追加到该块。 |
| `thinking_end` | `contentIndex`, `content` | 思考块以权威内容结束。 |
| `toolcall_start` | `contentIndex`, `id`, `toolName` | tool-call 块已开始。 |
| `toolcall_delta` | `contentIndex`, `delta` | 追加序列化的参数数据。 |
| `toolcall_end` | `contentIndex`, `toolCall` | 工具调用以完整的 `ToolCall` 结束。 |
| `done` | `reason`, `message` | 模型提供商的流已成功完成。 |
| `error` | `reason`, `error` | 模型提供商的流以错误或中止消息结束。 |

正常的代理循环会将 provider-level `start`、`done` 和 `error` 转换为 `message_start` 和 `message_end` 会话事件，而不是将它们作为 `message_update` 发出。对于构造匹配会话事件的调用方，它们仍会被导出的 `JsonAgentSessionEvent` 转换所接纳。

使用 `contentIndex` 来标识内容块。为实时显示缓冲 `delta` 字段，但要用 `text_end`、`thinking_end` 或 `toolcall_end` 中已完成的内容替换重建的数据。当 `message_end.message` 到达时，用它替换整个部分消息。

top-level `usage` 是助手响应的最新累计 provider-reported 用量。当模型提供商在流式传输期间不报告用量时，它可能会在完成之前一直保持为零。

```json
{"type":"message_update","usage":{"input":100,"output":1,"cacheRead":0,"cacheWrite":0,"totalTokens":101,"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"total":0}},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello "}}
```

## 工具执行事件｜ Tool execution events

| 事件 | 字段 | 含义 |
|---|---|---|
| `tool_execution_start` | `toolCallId`, `toolName`, `args` | 工具执行已开始。 |
| `tool_execution_update` | `toolCallId`, `toolName`, `args`, `partialResult` | 工具报告了部分结果。 |
| `tool_execution_end` | `toolCallId`, `toolName`, `result`, `isError` | 工具执行已完成。 |

使用 `toolCallId` 来关联生命周期。`partialResult` 是工具提供的最新部分结果。它是替换还是扩展先前的更新，取决于该工具的结果契约。

```json
{"type":"tool_execution_start","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"}}
{"type":"tool_execution_update","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"},"partialResult":{"content":[{"type":"text","text":"partial output"}],"details":{}}}
{"type":"tool_execution_end","toolCallId":"call_abc123","toolName":"bash","result":{"content":[{"type":"text","text":"complete output"}],"details":{}},"isError":false}
```

## 队列与状态事件｜ Queue and state events

| 事件 | 字段 | 含义 |
|---|---|---|
| `queue_update` | `steering`、`followUp` | 待处理的引导队列或 follow-up 队列发生了变化。两个字段都包含完整的当前队列。 |
| `entry_appended` | `entry` | 扩展通过 `pi.appendEntry()` 追加了一条自定义会话条目。 |
| `session_info_changed` | `name` | 会话显示名称发生了变化。`name` 缺失表示它已被清除。 |
| `thinking_level_changed` | `level` | 当前思考级别发生了变化。 |

`entry` 值使用持久化的 [会话 entry type](session-format.md#entry-types)。

## 上下文压缩事件｜上下文压缩 events

`compaction_start` 报告上下文压缩开始的原因：

```json
{"type":"compaction_start","reason":"threshold"}
```

`reason` 为 `"manual"`、`"threshold"` 或 `"overflow"`。

`compaction_end` 包含上下文压缩成功时的结果：

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {"...": "..."},
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

如果上下文压缩被中止，则 `result` 缺失，且 `aborted` 为 true。如果失败，则 `result` 缺失，`aborted` 为 false ，且 `errorMessage` 描述失败原因。成功的溢出恢复会在 Pi 重试提示词之前将 `willRetry` 设置为 true。

有关结果语义，请参见 [上下文压缩 and Branch Summaries](compaction.md)。

## 重试事件｜ Retry events

助手回合重试会发出：

```json
{"type":"auto_retry_start","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"529 overloaded"}
{"type":"auto_retry_end","success":true,"attempt":2}
```

在最终失败时，`auto_retry_end` 具有 `success: false` 和一个 `finalError` 字符串。

上下文压缩和 branch-summary 重试会发出：

```json
{"type":"summarization_retry_scheduled","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"terminated"}
{"type":"summarization_retry_attempt_start","source":"compaction","reason":"threshold"}
{"type":"summarization_retry_finished"}
```

对于分支摘要，`source` 为 `"branchSummary"`，且 `reason` 不存在。上下文压缩重试时的 `reason` 为 `"manual"`、`"threshold"` 或 `"overflow"`。

## 仅 RPC 事件

直接执行 RPC [`bash`](rpc-commands.md#bash) 命令会为每个输出块发出一个 `bash_execution_update`。其可选的 `id` 与命令 ID 匹配。最终命令响应可能包含截断的输出，但这些事件会流式传输所有输出：

```json
{"type":"bash_execution_update","id":"req-1","delta":"total 48\n"}
```

当扩展处理程序抛出异常时，RPC 还会添加 `extension_error`：

```json
{"type":"extension_error","extensionPath":"/path/to/extension.ts","event":"tool_call","error":"Error message"}
```

扩展 UI 记录是一个单独的 RPC 子协议，而不是 `AgentSessionEvent` 值。请参见 [RPC 扩展 UI](rpc-extension-ui.md)。

## TypeScript 类型

SDK 的 `AgentSessionEvent` 包含供 in-process 消费者使用的累积流式快照。JSON 和 RPC 仅转换 `message_update`：

```typescript
type WithoutPartial<T> = T extends { partial: unknown } ? Omit<T, "partial"> : T;

type JsonAssistantMessageEvent<T> = T extends { type: "toolcall_start"; partial: unknown }
  ? WithoutPartial<T> & { id: string; toolName: string }
  : WithoutPartial<T>;

type JsonAgentSessionEvent =
  | Exclude<AgentSessionEvent, { type: "message_update" }>
  | {
      type: "message_update";
      usage: Usage;
      assistantMessageEvent: JsonAssistantMessageEvent<AssistantMessageEvent>;
    };
```

使用从 `@earendil-works/pi-coding-agent` 导出的 `JsonAgentSessionEvent` 类型。其实现位于 [`json-event.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/json-event.ts)。

## 示例｜ Example

打印来自 one-shot 运行已完成的消息：

```bash
pi --mode json "List files" 2>/dev/null | jq -c 'select(.type == "message_end")'
```
