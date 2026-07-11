# RPC 模式

RPC 模式通过 stdin/stdout 上的 JSON 协议实现编程代理的无界面操作。这对于将代理嵌入其他应用程序、IDE 或自定义 UI 非常有用。

**Note for Node.js/类型Script users**: If you're building a Node.js application, consider using `Agent会话` directly from `@earendil-works/pi-coding-agent` instead of spawning a subprocess. See [`src/core/agent-session.ts`](../src/core/agent-session.ts) for the API. For a subprocess-based TypeScript client, see [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts).

## 启动 RPC 模式

```bash
pi --mode rpc [options]
```

常用选项：

- `--provider <name>`: Set the LLM provider (anthropic, openai, google, etc.)
- `--model <pattern>`: 模型ern or ID (supports `provider/id` and optional `:<thinking>`)
- `--name <name>` / `-n <name>`: Set the session display name at startup
- `--no-session`: Disable session persistence
- `--session-dir <path>`: Custom session storage directory

## 协议概述

- **命令ON objects sent to stdin, one per line
- **Responses**: JSON objects with `type: "response"` indicating command success/failure
- **事件 Agent events streamed to stdout as JSON lines

All commands support an optional `id` field for request/response correlation. If provided, the corresponding response will include the same `id`.

### 帧格式

RPC mode uses strict JSONL semantics with LF (`\n`) as the only record delimiter.

这对客户端很重要：

- Split records on `\n` only
- Accept optional `\r\n` by stripping a trailing `\r`
- 不要使用将 Unicode 分隔符视为换行符的通用行读取器

In particular, Node `readline` is not protocol-compliant for RPC mode because it also splits on `U+2028` and `U+2029`, which are valid inside JSON strings.

## Commands

### 提示

####

```json
{ "id": "req-1", "type": "prompt", "message": "Hello, world!" }
```

t", "message": "What's in this image?", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}

````

**During streaming**: If the agent is already streaming, you must specify `streamingBehavior` to queue the message:

```json
{"type": "prompt", "message": "New instruction", "streamingBehavior": ""}
````

- `"steer"`: Queue the message while the agent is running. It is delivered after the current assistant turn finishes executing its tool calls, before the next LLM call.
- `"followUp"`: Wait until the agent finishes. Message is delivered only when agent stops.

If the agent is streaming and no `streamingBehavior` is specified, the command returns an error.

**Extension commands**: If the message is an extension command (e.g., `/mycommand`), it executes immediately even during streaming. Extension commands manage their own LLM interaction via `pi.sendMessage()`.

**Input expansion**: Skill commands (`/skill:name`) and prompt templates (`/template`) are expanded before sending/queueing.

响应：ted before acceptance. Failures after acceptance are reported through the normal event and message stream, not as a second `response` for the same request id.

The `images` field is optional. Each image uses `ImageContent` format: `{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`.

#### steer

Queue a steering message while the agent is running. It is delivered after the current assistant turn finishes executing its tool calls, before the next LLM call. Skill commands and prompt templates are expanded. Extension commands are not allowed (use `prompt` instead).

```json
{ "type": "steer", "message": "Stop and do this instead" }
```

With images:

```json
{
  "type": "steer",
  "message": "Look at this instead",
  "images": [{ "type": "image", "data": "base64-encoded-data", "mimeType": "image/png" }]
}
```

The `images` field is optional. Each image uses `ImageContent` format (same as `prompt`).

Response:

```json
{ "type": "response", "command": "steer", "success": true }
```

See [set_steering_mode](#set_steering_mode) for controlling how steering messages are processed.

####

Queue a follow-up message to be processed after the agent finishes. Delivered only when agent has no more tool calls or steering messages. Skill commands and prompt templates are expanded. Extension commands are not allowed (use `prompt` instead).

```json
{ "type": "follow_up", "message": "After you're done, also do this" }
```

With images:

```json
{
  "type": "follow_up",
  "message": "Also check this image",
  "images": [{ "type": "image", "data": "base64-encoded-data", "mimeType": "image/png" }]
}
```

The `images` field is optional. Each image uses `ImageContent` format (same as `prompt`).

Response:

```json
{ "type": "response", "command": "follow_up", "success": true }
```

See [set_follow_up_mode](#set_follow_up_mode) for controlling how follow-up messages are processed.

####

```json
{ "type": "abort" }
```

Response:

```json
{ "type": "response", "command": "abort", "success": true }
```

####

Start a fresh session. Can be cancelled by a `session_before_switch` extension event handler.

```json
{ "type": "new_session" }
```

```json
{ "type": "new_session", "parentSession": "/path/to/parent-session.jsonl" }
```

Response:

```json
{ "type": "response", "command": "new_session", "success": true, "data": { "cancelled": false } }
```

```json
{ "type": "response", "command": "new_session", "success": true, "data": { "cancelled": true } }
```

###

####

```json
{ "type": "get_state" }
```

Response:

```json
{
  "type": "response",
  "command": "get_state",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isStreaming": false,
    "isCompacting": false,
    "steeringMode": "all",
    "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "sessionName": "my-feature-work",
    "auto上下文压缩Enabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

The `model` field is a full [Model](#model) object or `null`. The `sessionName` field is the display name set via ``, or omitted if not set.

####

```json
{ "type": "get_messages" }
```

Response:

```json
{
  "type": "response",
  "command": "get_messages",
  "success": true,
  "data": {"messages": [...]}
}
```

Messages are `AgentMessage` objects (see [Message ](#message-types)).

### Model

####

```json
{ "type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514" }
```

Response contains the full [Model](#model) object:

```json
{
  "type": "response",
  "command": "set_model",
  "success": true,
  "data": {...}
}
```

####

Cycle to the next available model. Returns `null` data if only one model available.

```json
{ "type": "cycle_model" }
```

Response:

```json
{
  "type": "response",
  "command": "cycle_model",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isScoped": false
  }
}
```

The `model` field is a full [Model](#model) object.

#### get_available_models

列出所有已配置的模型。

```json
{ "type": "get_available_models" }
```

Response contains an array of full [Model](#model) objects:

```json
{
  "type": "response",
  "command": "get_available_models",
  "success": true,
  "data": {
    "models": [...]
  }
}
```

### 思考

#### set_thinking_level

为支持该功能的模型设置推理/思考级别。

```json
{ "type": "set_thinking_level", "level": "high" }
```

Levels: `"off"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`, `"max"`

`"xhigh"` and `"max"` are exposed only when supported by the ed model. Some models, including GPT-5.6, expose both.

Response:

```json
{ "type": "response", "command": "set_thinking_level", "success": true }
```

#### cycle_thinking_level

Cycle through available thinking levels. Returns `null` data if model doesn't support thinking.

```json
{ "type": "cycle_thinking_level" }
```

Response:

```json
{
  "type": "response",
  "command": "cycle_thinking_level",
  "success": true,
  "data": { "level": "high" }
}
```

### 队列模式

#### set_steering_mode

Control how steering messages (from `steer`) are delivered.

```json
{ "type": "set_steering_mode", "mode": "one-at-a-time" }
```

模式：`"all"`: Deliver all steering messages after the current assistant turn finishes executing its tool calls

- `"one-at-a-time"`: Deliver one steering message per completed assistant turn (default)

Response:

```json
{ "type": "response", "command": "set_steering_mode", "success": true }
```

#### set_follow_up_mode

Control how follow-up messages (from `follow_up`) are delivered.

```json
{ "type": "set_follow_up_mode", "mode": "one-at-a-time" }
```

Modes:

- `"all"`: Deliver all follow-up messages when agent finishes
- `"one-at-a-time"`: Deliver one follow-up message per agent completion (default)

Response:

```json
{ "type": "response", "command": "set_follow_up_mode", "success": true }
```

### Compaction

#### compact

手动压缩对话上下文以减少 token 使用量。

```json
{ "type": "compact" }
```

使用自定义指令：

```json
{ "type": "compact", "customInstructions": "Focus on code changes" }
```

Response:

```json
{
  "type": "response",
  "command": "compact",
  "success": true,
  "data": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "details": {}
  }
}
```

`estimatedTokensAfter` is a heuristic estimate over the rebuilt message context immediately after compaction, not a provider-exact token count.

#### set_auto_compaction

启用或禁用在上下文接近满载时的自动压缩。

```json
{ "type": "set_auto_compaction", "enabled": true }
```

Response:

```json
{ "type": "response", "command": "set_auto_compaction", "success": true }
```

### 重试

#### set_auto_retry

启用或禁用在遇到瞬时错误（过载、速率限制、5xx ）时的自动重试。

```json
{ "type": "set_auto_retry", "enabled": true }
```

Response:

```json
{ "type": "response", "command": "set_auto_retry", "success": true }
```

#### abort_retry

中止正在进行的重试（取消延迟并停止重试）。

```json
{ "type": "abort_retry" }
```

Response:

```json
{ "type": "response", "command": "abort_retry", "success": true }
```

### Bash

#### bash

执行 shell 命令并将输出添加到对话上下文中。

```json
{ "type": "bash", "command": "ls -la" }
```

Response:

```json
{
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "total 48\ndrwxr-xr-x ...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": false
  }
}
```

If output was truncated, includes `fullOutputPath`:

```json
{
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "truncated output...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": true,
    "fullOutputPath": "/tmp/pi-bash-abc123.log"
  }
}
```

**bash 结果如何到达 LLM ：**

The `bash` command executes immediately and returns a `BashResult`. Internally, a `Bash 执行消息` is created and stored in the agent's message state. This message does NOT emit an event.

When the next `prompt` command is sent, all messages (including `BashExecutionMessage`) are transformed before being sent to the LLM. The `BashExecutionMessage` is converted to a `用户消息` with this format:

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

这意味着：

1. Bash output is included in the LLM context on the **next prompt**, not immediately
2. 可以在一个提示词之前执行多个 bash 命令；所有输出都将被包含
3. No event is emitted for the `BashExecutionMessage` itself

#### abort_bash

中止正在运行的 bash 命令。

```json
{ "type": "abort_bash" }
```

Response:

```json
{ "type": "response", "command": "abort_bash", "success": true }
```

### Session

#### get_session_stats

获取令牌使用量、成本统计信息以及当前上下文窗口使用情况。

```json
{ "type": "get_session_stats" }
```

Response:

```json
{
  "type": "response",
  "command": "get_session_stats",
  "success": true,
  "data": {
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "userMessages": 5,
    "assistantMessages": 5,
    "toolCalls": 12,
    "toolResults": 12,
    "totalMessages": 22,
    "tokens": {
      "input": 50000,
      "output": 10000,
      "cacheRead": 40000,
      "cacheWrite": 5000,
      "total": 105000
    },
    "cost": 0.45,
    "contextUsage": {
      "tokens": 60000,
      "contextWindow": 200000,
      "percent": 30
    }
  }
}
```

`tokens` contains assistant usage totals for the current session state. `contextUsage` contains the actual current context-window estimate used for compaction and footer display.

`contextUsage` is omitted when no model or context window is available. `contextUsage.tokens` and `contextUsage.percent` are `null` immediately after compaction until a fresh post-compaction assistant response provides valid usage data.

#### export_html

将会话导出为 HTML 文件。

```json
{ "type": "export_html" }
```

使用自定义路径：

```json
{ "type": "export_html", "outputPath": "/tmp/session.html" }
```

Response:

```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": { "path": "/tmp/session.html" }
}
```

#### switch_session

Load a different session file. Can be cancelled by a `session_before_switch` extension event handler.

```json
{ "type": "switch_session", "sessionPath": "/path/to/session.jsonl" }
```

Response:

```json
{ "type": "response", "command": "switch_session", "success": true, "data": { "cancelled": false } }
```

如果扩展取消了切换：

```json
{ "type": "response", "command": "switch_session", "success": true, "data": { "cancelled": true } }
```

#### fork

Create a new fork from a previous user message on the active branch. Can be cancelled by a `session_before_fork` extension event handler. Returns the text of the message being forked from.

```json
{ "type": "fork", "entryId": "abc123" }
```

Response:

```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": { "text": "The original prompt text...", "cancelled": false }
}
```

```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": { "text": "The original prompt text...", "cancelled": true }
}
```

####

Duplicate the current active branch into a new session at the current position. Can be cancelled by a `session_before_fork` extension event handler.

```json
{ "type": "clone" }
```

Response:

```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": { "cancelled": false }
}
```

```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": { "cancelled": true }
}
```

####

```json
{ "type": "get_fork_messages" }
```

Response:

```json
{
  "type": "response",
  "command": "get_fork_messages",
  "success": true,
  "data": {
    "messages": [
      { "entryId": "abc123", "text": "First prompt..." },
      { "entryId": "def456", "text": "Second prompt..." }
    ]
  }
}
```

####

Get all session entries in append order (excluding the session header). The session is an append-only tree of entries with stable ids, so an entry id works as a durable cursor: pass the last entry id you have seen as `since` to get only entries strictly after it, even across client restarts. Unlike `get_messages`, this includes pre-compaction history and abandoned branches.

```json
{ "type": "get_entries" }
```

```json
{ "type": "get_entries", "since": "abc123" }
```

Response:

```json
{
  "type": "response",
  "command": "get_entries",
  "success": true,
  "data": {
    "entries": [
      {
        "type": "message",
        "id": "def456",
        "parentId": "abc123",
        "timestamp": "...",
        "message": { "role": "user", "...": "..." }
      }
    ],
    "leafId": "def456"
  }
}
```

`leafId` is the id of the current leaf entry (`null` for an empty session), so a client can tell in one round trip whether the active branch moved. If `since` does not match any entry id, the response is `success: false`.

####

Get the session as a tree of entries. Each node is `{entry, children, label?, labelTimestamp?}`. A well-formed session has a single root; orphaned entries (broken parent chain) also appear as roots.

```json
{ "type": "get_tree" }
```

Response:

```json
{
  "type": "response",
  "command": "get_tree",
  "success": true,
  "data": {
    "tree": [
      {
        "entry": { "type": "message", "id": "abc123", "parentId": null, "...": "..." },
        "children": [
          {
            "entry": { "type": "message", "id": "def456", "parentId": "abc123", "...": "..." },
            "children": []
          }
        ]
      }
    ],
    "leafId": "def456"
  }
}
```

####

```json
{ "type": "get_last_assistant_text" }
```

Response:

```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": { "text": "The assistant's response..." }
}
```

Returns `{"text": null}` if no assistant messages exist.

#### set_session_name

```json
{ "type": "set_session_name", "name": "my-feature-work" }
```

Response:

```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

The current session name is available via `get_state` in the `sessionName` field. To set the initial name when starting RPC mode, pass `--name <name>` or `-n <name>` to the `pi --mode rpc` process.

### Commands

#### get_commands

Get available commands (extension commands, prompt templates, and skills). These can be invoked via the `prompt` command by prefixing with `/`.

```json
{ "type": "get_commands" }
```

Response:

```json
{
  "type": "response",
  "command": "get_commands",
  "success": true,
  "data": {
    "commands": [
      {
        "name": "session-name",
        "description": "Set or clear session name",
        "source": "extension",
        "path": "/home/user/.pi/agent/extensions/session.ts"
      },
      {
        "name": "fix-tests",
        "description": "Fix failing tests",
        "source": "prompt",
        "location": "project",
        "path": "/home/user/myproject/.pi/agent/prompts/fix-tests.md"
      },
      {
        "name": "skill:brave-search",
        "description": "Web search via Brave API",
        "source": "skill",
        "location": "user",
        "path": "/home/user/.pi/agent/skills/brave-search/SKILL.md"
      }
    ]
  }
}
```

每个命令包含：

- `name`: Command name (invoke with `/name`)
- `description`: Human-readable description (optional for extension commands)
- `source`: What kind of command:
  - `"extension"`: Registered via `pi.registerCommand()` in an extension
  - `"prompt"`: Loaded from a prompt template `.md` file
  - `"skill"`: Loaded from a skill directory (name is prefixed with `skill:`)
- `location`: Where it was loaded from (optional, not present for extensions):
  - `"user"`: User-level (`~/.pi/agent/`)
  - `"project"`: Project-level (`./.pi/agent/`)
  - `"path"`: Explicit path via CLI or settings
- `path`: Absolute file path to the command source (optional)

**Note**: Built-in TUI commands (`/settings`, `/hotkeys`, etc.) are not included. They are handled only in interactive mode and would not execute if sent via `prompt`.

## Events

Events are streamed to stdout as JSON lines during agent operation. Events do NOT include an `id` field (only responses do).

### 事件类型

| Event | 描述--|-------------|
| `agent_start` | 代理开始处理 |
| `agent_end` | 一次底层代理运行完成（可能仍会进行重试、上下文压缩或排队的后续运行） |
| `agent_settled` | 代理运行已完全结束；没有自动重试、上下文压缩重试或排队的后续运行 |
| `turn_start` | 新一轮对话开始 |
| `turn_end` | 一轮对话完成（包含助手消息和工具执行结果） |
| `message_start` | 消息开始生成 |
| `message_update` | 流式更新（文本/思考/工具调用的增量数据） |
| `message_end` | 消息生成完成 |
| `tool_execution_start` | 工具开始执行 |
| `tool_execution_update` | 工具执行进度（流式输出） |
| `tool_execution_end` | 工具执行完成 |
| ``| 待处理的引导/后续任务队列已变更 |
| `compaction_start` | 上下文压缩开始 |
| `compaction_end` | 上下文压缩完成 |
| `auto_retry_start` | 自动重试开始（在发生瞬时错误后） |
| `auto_retry_end` | 自动重试完成（成功或最终失败） |
|`` | 扩展抛出了错误 |

### agent_start

当代理开始处理提示词时发出。

```json
{ "type": "agent_start" }
```

### agent_end

Emitted when one low-level agent run completes. Contains all messages generated during this run. If `willRetry` is true, an automatic retry will follow.

```json
{
  "type": "agent_end",
  "messages": [...],
  "willRetry": false
}
```

### agent_settled

在完整的会话级运行稳定后发出。此时， Pi 将不会通过重试、上下文压缩重试或排队的后续消息自动继续。

```json
{ "type": "agent_settled" }
```

### turn_start / turn_end

一个轮次包含一次助手响应以及由此产生的任何工具调用和结果。

```json
{ "type": "turn_start" }
```

```json
{
  "type": "turn_end",
  "message": {...},
  "toolResults": [...]
}
```

### message_start / message_end

Emitted when a message begins and completes. The `message` field contains an `AgentMessage`.

```json
{"type": "message_start", "message": {...}}
{"type": "message_end", "message": {...}}
```

### message_update （流式传输）

在助手消息流式传输期间发出。包含部分消息和一个流式增量事件。

```json
{
  "type": "message_update",
  "message": {...},
  "assistantMessageEvent": {
    "type": "text_delta",
    "contentIndex": 0,
    "delta": "Hello ",
    "partial": {...}
  }
}
```

The `assistantMessageEvent` field contains one of these delta types:

| Type             | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `start`          | 消息生成已开始                                               |
| `text_start`     | 文本内容块已开始                                             |
| `text_delta`     | 文本内容块                                                   |
| `text_end`       | 文本内容块结束                                               |
| `thinking_start` | 思考块开始                                                   |
| `thinking_delta` | 思考内容块                                                   |
| `thinking_end`   | 思考块结束                                                   |
| `toolcall_start` | 工具调用开始                                                 |
| `toolcall_delta` | 工具调用参数块                                               |
| `toolcall_end`   | Tool call ended (includes full `toolCall` object)            |
| `done`           | Message complete (reason: `"stop"`, `"length"`, `"toolUse"`) |
| `error`          | Error occurred (reason: `"aborted"`, `"error"`)              |

流式传输文本响应的示例：

```json
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_start","contentIndex":0,"partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello","partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":" world","partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_end","contentIndex":0,"content":"Hello world","partial":{...}}}
```

### tool_execution_start / tool_execution_update / tool_execution_end

当工具开始执行、流式传输进度以及完成执行时发出。

```json
{
  "type": "tool_execution_start",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": { "command": "ls -la" }
}
```

During execution, `tool_execution_update` events stream partial results (e.g., bash output as it arrives):

```json
{
  "type": "tool_execution_update",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": { "command": "ls -la" },
  "partialResult": {
    "content": [{ "type": "text", "text": "partial output so far..." }],
    "details": { "truncation": null, "fullOutputPath": null }
  }
}
```

完成时：

```json
{
  "type": "tool_execution_end",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "result": {
    "content": [{"type": "text", "text": "total 48\n..."}],
    "details": {...}
  },
  "isError": false
}
```

Use `toolCallId` to correlate events. The `partialResult` in `tool_execution_update` contains the accumulated output so far (not just the delta), allowing clients to simply replace their display on each update.

### queue_update

```json
{
  "type": "queue_update",
  "steering": ["Focus on error handling"],
  "followUp": ["After that, summarize the result"]
}
```

###

```json
{ "type": "compaction_start", "reason": "threshold" }
```

The `reason` field is `"manual"`, `"threshold"`, or `"overflow"`.

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

If `reason` was `"overflow"` and compaction succeeds, `willRetry` is `true` and the agent will automatically retry the prompt.

If compaction was aborted, `result` is `null` and `aborted` is `true`.

If compaction failed (e.g., API quota exceeded), `result` is `null`, `aborted` is `false`, and `errorMessage` contains the error description.

###

```json
{
  "type": "auto_retry_start",
  "attempt": 1,
  "maxAttempts": 3,
  "delayMs": 2000,
  "errorMessage": "529 {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"Overloaded\"}}"
}
```

```json
{
  "type": "auto_retry_end",
  "success": true,
  "attempt": 2
}
```

```json
{
  "type": "auto_retry_end",
  "success": false,
  "attempt": 3,
  "finalError": "529 overloaded_error: Overloaded"
}
```

### extension_error

```json
{
  "type": "extension_error",
  "extensionPath": "/path/to/extension.ts",
  "event": "tool_call",
  "error": "Error message..."
}
```

##

Extensions can request user interaction via `ctx.ui.select()`, `ctx.ui.()`, etc. In RPC mode, these are translated into a request/response sub-protocol on top of the base command/event flow.

- **Dialog methods** (`select`, `confirm`, `input`, ``): emit an `extension_ui_request` on stdout and block until the client sends back an `extension_ui_response` on stdin with the matching `id`.
- **Fire-and-forget methods** (`, `, `, `, ``): emit an `extension_ui_request` on stdout but do not expect a response. The client can display the information or ignore it.

If a dialog method includes a `timeout` field, the agent-side will auto-resolve with a default value when the timeout expires. The client does not need to track timeouts.

Some `ExtensionUIContext` methods are not supported or degraded in RPC mode because they require direct TUI access:

- `custom()` returns `undefined`
- `setWorkingMessage()`, `setWorkingIndicator()`, `setFooter()`, `setHeader()`, `setEditorComponent()`, `setToolsExpanded()` are no-ops
- `getEditorText()` returns `""`
- `getToolsExpanded()` returns `false`
- `pasteToEditor()` delegates to `setEditorText()` (no paste/collapse handling)
- `getAllThemes()` returns `[]`
- `getTheme()` returns `undefined`
- `setTheme()` returns `{ success: false, error: "..." }`

Note: `ctx.mode` is `"rpc"` and `ctx.hasUI` is `true` in RPC mode because the dialog and fire-and-forget methods are functional via the extension UI sub-protocol. Use `ctx.mode === "tui"` to guard TUI-specific features like `custom()` that require a real terminal.

###

All requests have `type: "extension_ui_request"`, a unique `id`, and a `method` field.

#### select

Prompt the user to choose from a list. Dialog methods with a `timeout` field include the timeout in milliseconds; the agent auto-resolves with `undefined` if the client doesn't respond in time.

```json
{
  "type": "extension_ui_request",
  "id": "uuid-1",
  "method": "select",
  "title": "Allow dangerous command?",
  "options": ["Allow", "Block"],
  "timeout": 10000
}
```

Expected response: `extension_ui_response` with `value` (the selected option string) or `cancelled: true`.

#### confirm

```json
{
  "type": "extension_ui_request",
  "id": "uuid-2",
  "method": "confirm",
  "title": "Clear session?",
  "message": "All messages will be lost.",
  "timeout": 5000
}
```

Expected response: `extension_ui_response` with `confirmed: true/false` or `cancelled: true`.

#### input

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

Expected response: `extension_ui_response` with `value` (the entered text) or `cancelled: true`.

#### editor

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

Expected response: `extension_ui_response` with `value` (the edited text) or `cancelled: true`.

#### notify

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

The `notifyType` field is `"info"`, `"warning"`, or `"error"`. Defaults to `"info"` if omitted.

#### setStatus

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

Send `statusText: undefined` (or omit it) to clear the status entry for that key.

#### setWidget

```json
{
  "type": "extension_ui_request",
  "id": "uuid-7",
  "method": "setWidget",
  "widgetKey": "my-ext",
  "widgetLines": ["--- My Widget ---", "Line 1", "Line 2"],
  "widgetPlacement": "aboveEditor"
}
```

Send `widgetLines: undefined` (or omit it) to clear the widget. The `widgetPlacement` field is `"aboveEditor"` (default) or `"belowEditor"`. Only string arrays are supported in RPC mode; component factories are ignored.

#### setTitle

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

#### set_editor_text

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

###

Responses are sent for dialog methods only (`select`, `confirm`, `input`, `editor`). The `id` must match the request.

####

```json
{ "type": "extension_ui_response", "id": "uuid-1", "value": "Allow" }
```

####

```json
{ "type": "extension_ui_response", "id": "uuid-2", "confirmed": true }
```

####

Dismiss any dialog method. The extension receives `undefined` (for select/input/editor) or `false` (for confirm).

```json
{ "type": "extension_ui_response", "id": "uuid-3", "cancelled": true }
```

##

Failed commands return a response with `success: false`:

```json
{
  "type": "response",
  "command": "set_model",
  "success": false,
  "error": "Model not found: invalid/model"
}
```

```json
{
  "type": "response",
  "command": "parse",
  "success": false,
  "error": "Failed to parse command: Unexpected token..."
}
```

## Types

- [`packages/ai/src/types.ts`](../../ai/src/types.ts) - `Model`, `UserMessage`, `助手消息`, `工具结果消息`
- [`packages/agent/src/types.ts`](../../agent/src/types.ts) - `AgentMessage`, `AgentEvent`
- [`src/core/messages.ts`](../src/core/messages.ts) - `BashExecutionMessage`
- [`src/modes/rpc/rpc-types.ts`](../src/modes/rpc/rpc-types.ts) - RPC command/response types, extension UI request/response types

### Model

```json
{
  "id": "claude-sonnet-4-20250514",
  "name": "Claude Sonnet 4",
  "api": "anthropic-messages",
  "provider": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "reasoning": true,
  "input": ["text", "image"],
  "contextWindow": 200000,
  "maxTokens": 16384,
  "cost": {
    "input": 3.0,
    "output": 15.0,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  }
}
```

### UserMessage

```json
{
  "role": "user",
  "content": "Hello!",
  "timestamp": 1733234567890,
  "attachments": []
}
```

The `content` field can be a string or an array of `TextContent`/`ImageContent` blocks.

### AssistantMessage

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Hello! How can I help?" },
    { "type": "thinking", "thinking": "User is greeting me..." },
    { "type": "toolCall", "id": "call_123", "name": "bash", "arguments": { "command": "ls" } }
  ],
  "api": "anthropic-messages",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "usage": {
    "input": 100,
    "output": 50,
    "cacheRead": 0,
    "cacheWrite": 0,
    "cost": {
      "input": 0.0003,
      "output": 0.00075,
      "cacheRead": 0,
      "cacheWrite": 0,
      "total": 0.00105
    }
  },
  "stopReason": "stop",
  "timestamp": 1733234567890
}
```

Stop reasons: `"stop"`, `"length"`, `"toolUse"`, `"error"`, `"aborted"`

### ToolResultMessage

```json
{
  "role": "toolResult",
  "toolCallId": "call_123",
  "toolName": "bash",
  "content": [{ "type": "text", "text": "total 48\ndrwxr-xr-x ..." }],
  "isError": false,
  "timestamp": 1733234567890
}
```

### BashExecutionMessage

Created by the `bash` RPC command (not by LLM tool calls):

```json
{
  "role": "bashExecution",
  "command": "ls -la",
  "output": "total 48\ndrwxr-xr-x ...",
  "exitCode": 0,
  "cancelled": false,
  "truncated": false,
  "fullOutputPath": null,
  "timestamp": 1733234567890
}
```

### 附件

```json
{
  "id": "img1",
  "type": "image",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "content": "base64-encoded-data...",
  "extractedText": null,
  "preview": null
}
```

## 示例：基础客户端（ Python ）

```python
import subprocess
import json

proc = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True
)

def send(cmd):
    proc.stdin.write(json.dumps(cmd) + "\n")
    proc.stdin.flush()

def read_events():
    for line in proc.stdout:
        yield json.loads(line)

# Send prompt
send({"type": "prompt", "message": "Hello!"})

# Process events
for event in read_events():
    if event.get("type") == "message_update":
        delta = event.get("assistantMessageEvent", {})
        if delta.get("type") == "text_delta":
            print(delta["delta"], end="", flush=True)

    if event.get("type") == "agent_end":
        print()
        break
```

## 示例：交互式客户端（ Node.js ）

See [`test/rpc-example.ts`](../test/rpc-example.ts) for a complete interactive example, or [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts) for a typed client implementation.

For a complete example of handling the extension UI protocol, see [`examples/rpc-extension-ui.ts`](../examples/rpc-extension-ui.ts) which pairs with the [`examples/extensions/rpc-demo.ts`](../examples/extensions/rpc-demo.ts) extension.

```javascript
const { spawn } = require("child_process");
const { StringDecoder } = require("string_decoder");

const agent = spawn("pi", ["--mode", "rpc", "--no-session"]);

function attachJsonlReader(stream, onLine) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) break;

      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      onLine(line);
    }
  });

  stream.on("end", () => {
    buffer += decoder.end();
    if (buffer.length > 0) {
      onLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
    }
  });
}

attachJsonlReader(agent.stdout, (line) => {
  const event = JSON.parse(line);

  if (event.type === "message_update") {
    const { assistantMessageEvent } = event;
    if (assistantMessageEvent.type === "text_delta") {
      process.stdout.write(assistantMessageEvent.delta);
    }
  }
});

// Send prompt
agent.stdin.write(JSON.stringify({ type: "prompt", message: "Hello" }) + "\n");

// Abort on Ctrl+C
process.on("SIGINT", () => {
  agent.stdin.write(JSON.stringify({ type: "abort" }) + "\n");
});
```
