# RPC 模式

RPC 模式通过 stdin/stdout 上的 JSON 协议，实现编程代理的无头操作。这对于将代理嵌入到其他应用程序、IDE 或自定义 UI 中非常有用。

**Node.js/TypeScript 用户请注意**：如果您正在构建 Node.js 应用程序，请考虑直接使用 `@earendil-works/pi-coding-agent` 中的 `AgentSession`，而不是启动子进程。有关 API 的信息，请参见 [`src/core/agent-session.ts`](../src/core/agent-session.ts)。对于 subprocess-based TypeScript 客户端，请参见 [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts)。

## 正在启动 RPC 模式

```bash
pi --mode rpc [options]
```

Common options:
- `--provider <name>`：设置 LLM 模型提供商 (anthropic、openai、google 等)
- `--model <pattern>`：模型模式或 ID (支持 `provider/id` 和可选的 `:<thinking>`)
- `--name <name>` / `-n <name>`：在启动时设置会话显示名称
- `--no-session`: Disable 会话 persistence
- `--session-dir <path>`：自定义会话存储目录

## 协议概述｜ Protocol Overview

- **命令**：发送到 stdin 的 JSON 对象，每行一个
- **响应**：带有 `type: "response"` 指示命令成功/失败的 JSON 对象
- **事件**：代理事件以 JSON 行的形式流式输出到 stdout

所有命令都支持可选的 `id` 字段用于请求/响应关联。如果提供了该字段，相应的响应将包含相同的 `id`。`bash_execution_update` 事件也包含其来源 `bash` 命令的 `id`。

### 帧格式｜ Framing

RPC 模式使用严格的 JSONL 语义，仅以 LF (`\n`) 作为记录分隔符。

这对客户端很重要：
- 仅按 `\n` 分割记录
- 通过去除末尾的 `\r` 接受可选的 `\r\n` 输入
- 不要使用将 Unicode 分隔符视为换行符的通用行读取器

尤其要注意， Node `readline` 对于 RPC 模式不是 protocol-compliant，因为它也会根据 `U+2028` 和 `U+2029` 进行拆分，而这两个符号在 JSON 字符串中是有效的。

## 命令｜ Commands

### 提示｜ Prompting

#### prompt

向代理发送用户提示。命令响应在提示被接受、排队或处理后立即发出。事件在接受后继续异步流式输出。

```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

带图片：
```json
{"type": "prompt", "message": "What's in this image?", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

**流式输出期间**：如果代理已经在流式输出，您必须指定 `streamingBehavior` 来排队消息：

```json
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
```

- `"steer"`：在代理运行时将消息排队。它将在当前助手轮次完成执行其工具调用后、下一次 LLM 调用之前被投递。
- `"followUp"`：等待直到代理完成。仅在代理停止时投递消息。

如果代理正在流式输出且未指定 `streamingBehavior`，该命令将返回错误。

**扩展命令**：如果消息是扩展命令 (e.g., `/mycommand`)，即使正在流式输出也会立即执行。扩展命令通过 `pi.sendMessage()` 管理自己的 LLM 交互。

**输入扩展**：技能命令 (`/skill:name`) 和提示词模板 (`/template`) 在发送/排队之前会被扩展。

响应：
```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true}
```

`success: true`表示提示词被接受、排队或立即处理。`success: false`表示提示词在接受前被拒绝。接受后的失败通过正常的事件和消息流报告，而不是作为同一请求 ID 的第二个`response`。

`images`字段是可选的。每个图像使用`ImageContent`格式：`{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`。

#### steer

在代理运行时排队一条引导消息。它在当前助手轮次完成执行其工具调用后、下一次LLM调用之前传递。技能命令和提示词模板会被扩展。不允许扩展命令(请改用`prompt`)。

```json
{"type": "steer", "message": "Stop and do this instead"}
```

附带图像：
```json
{"type": "steer", "message": "Look at this instead", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images`字段是可选的。每个图像使用`ImageContent`格式(与`prompt`相同)。

响应：
```json
{"type": "response", "command": "steer", "success": true}
```

请参阅[set_steering_mode](#set_steering_mode)以了解如何控制引导消息的处理方式。

#### follow_up

排队一条follow-up消息，在代理完成后处理。仅在代理没有更多工具调用或引导消息时传递。技能命令和提示词模板会被扩展。不允许扩展命令(请改用`prompt`)。

```json
{"type": "follow_up", "message": "After you're done, also do this"}
```

附带图像：
```json
{"type": "follow_up", "message": "Also check this image", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images`字段是可选的。每个图像使用`ImageContent`格式(与`prompt`相同)。

响应：
```json
{"type": "response", "command": "follow_up", "success": true}
```

请参阅[set_follow_up_mode](#set_follow_up_mode)以了解如何控制follow-up消息的处理方式。

#### abort

中止当前代理操作。

```json
{"type": "abort"}
```

响应：
```json
{"type": "response", "command": "abort", "success": true}
```

#### new_会话

开始一个新的会话。可以被一个`session_before_switch`扩展事件处理器取消。

```json
{"type": "new_session"}
```

附带可选的父会话跟踪：
```json
{"type": "new_session", "parentSession": "/path/to/parent-session.jsonl"}
```

响应：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": false}}
```

如果扩展取消了：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": true}}
```

### State

#### get_state

获取当前会话状态。

```json
{"type": "get_state"}
```

响应：
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
    "autoCompactionEnabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

`model` 字段是一个完整的 [Model](#model) 对象或 `null`。`sessionName` 字段是通过 `set_session_name` 设置的显示名称，如果未设置则省略。

#### get_messages

获取对话中的所有消息。

```json
{"type": "get_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_messages",
  "success": true,
  "data": {"messages": [...]}
}
```

消息是 `AgentMessage` 对象 (参见 [消息类型](#message-types))。

### 模型｜ Model

#### set_model

切换到指定模型。

```json
{"type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514"}
```

响应包含完整的 [Model](#model) 对象：
```json
{
  "type": "response",
  "command": "set_model",
  "success": true,
  "data": {...}
}
```

#### cycle_model

切换到下一个可用模型。如果只有一个模型可用，则返回 `null` 数据。

```json
{"type": "cycle_model"}
```

响应：
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

`model` 字段是一个完整的 [Model](#model) 对象。

#### get_available_models

列出所有已配置的模型。

```json
{"type": "get_available_models"}
```

响应包含一个完整的 [Model](#model) 对象数组：
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

### 思考｜ Thinking

#### set_thinking_level

设置支持该功能的模型的推理/思考级别。

```json
{"type": "set_thinking_level", "level": "high"}
```

级别：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`

`"xhigh"` 和 `"max"` 仅在所选模型支持时才会暴露。某些模型（包括 GPT-5.6 ）会同时暴露两者。

响应：
```json
{"type": "response", "command": "set_thinking_level", "success": true}
```

#### cycle_thinking_level

循环遍历可用的思考级别。如果模型不支持思考，则返回`null`数据。

```json
{"type": "cycle_thinking_level"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_thinking_level",
  "success": true,
  "data": {"level": "high"}
}
```

#### get_available_thinking_levels

列出当前模型支持的思考级别。对于不支持推理的模型，返回`["off"]`。

```json
{"type": "get_available_thinking_levels"}
```

响应：
```json
{
  "type": "response",
  "command": "get_available_thinking_levels",
  "success": true,
  "data": {
    "levels": ["off", "minimal", "low", "medium", "high"]
  }
}
```

### 队列模式｜ Queue Modes

#### set_steering_mode

控制如何传递引导消息(来自 `steer`)。

```json
{"type": "set_steering_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：在当前助手回合完成工具调用后传递所有引导消息。
- `"one-at-a-time"`：每个完成的助手回合传递一条引导消息(默认)

响应：
```json
{"type": "response", "command": "set_steering_mode", "success": true}
```

#### set_follow_up_mode

控制如何传递follow-up消息(来自`follow_up`)。

```json
{"type": "set_follow_up_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：代理完成时传递所有follow-up消息。
- `"one-at-a-time"`：每次代理完成时传递一条follow-up消息(默认)

响应：
```json
{"type": "response", "command": "set_follow_up_mode", "success": true}
```

### 压缩｜上下文压缩

#### compact

手动压缩会话上下文以减少令牌使用量。

```json
{"type": "compact"}
```

使用自定义指令：
```json
{"type": "compact", "customInstructions": "Focus on code changes"}
```

响应：
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
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  }
}
```

`estimatedTokensAfter` 是对压缩后立即重建的消息上下文的启发式估计，而不是 provider-exact 令牌计数。`usage` 报告生成摘要的 LLM 调用或调用，自定义压缩处理器可能会省略它。

#### set_auto_上下文压缩

启用或禁用上下文即将满时的自动压缩。

```json
{"type": "set_auto_compaction", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_compaction", "success": true}
```

### 重试｜ Retry

#### set_auto_retry

启用或禁用对瞬时错误 (过载、速率限制、5xx) 的自动重试。

```json
{"type": "set_auto_retry", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_retry", "success": true}
```

#### abort_retry

中止 in-progress 重试 (取消延迟并停止重试)。

```json
{"type": "abort_retry"}
```

响应：
```json
{"type": "response", "command": "abort_retry", "success": true}
```

### Bash

#### bash

执行 shell 命令并将输出添加到对话上下文。命令运行时，输出以 `bash_execution_update` 事件流式传输；响应包含最终结果。

```json
{"id": "req-1", "type": "bash", "command": "ls -la"}
```

包含一个 `id` 以将此命令的流式 `bash_execution_update` 事件关联起来。

响应：
```json
{
  "id": "req-1",
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

如果输出被截断，则包含 `fullOutputPath`：
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

**bash 结果如何到达 LLM：**

`bash` 命令立即执行并返回一个 `BashResult`。在内部，会创建一个 `BashExecutionMessage` 并存储在代理的消息状态中。

当下一条 `prompt` 命令发送时，所有消息 (包括 `BashExecutionMessage`) 在发送到 LLM 之前都会被转换。`BashExecutionMessage` 会被转换为 `UserMessage`，格式如下：

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

这意味着：
1. Bash 输出会在 **下一次提示** 时包含在 LLM 上下文中，而不是立即生效
2. 可以在一次提示之前执行多个 bash 命令；所有输出都会被包含

#### 中止_bash

中止正在运行的 bash 命令。

```json
{"type": "abort_bash"}
```

响应：
```json
{"type": "response", "command": "abort_bash", "success": true}
```

### 会话｜会话

#### 获取_会话_统计

获取令牌用量、成本统计和当前上下文窗口使用情况。

```json
{"type": "get_session_stats"}
```

响应：
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

`tokens` 和 `cost` 包括整个会话中的助手消息、工具报告的用量，以及压缩/branch-summary 生成。`contextUsage` 包含用于压缩和页脚显示的实际当前 context-window 估算值。

当没有模型或上下文窗口可用时，`contextUsage` 被省略。`contextUsage.tokens` 和 `contextUsage.percent` 在压缩后立即变为 `null`，直到新的 post-compaction 助手响应提供有效用量数据。

#### 导出_HTML

将会话导出为 HTML 文件。

```json
{"type": "export_html"}
```

使用自定义路径：
```json
{"type": "export_html", "outputPath": "/tmp/session.html"}
```

响应：
```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": {"path": "/tmp/session.html"}
}
```

#### 切换_会话

加载不同的会话文件。可由 `session_before_switch` 扩展事件处理程序取消。

```json
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
```

响应：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": false}}
```

如果扩展取消了切换：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": true}}
```

#### 分支

从活动分支上的先前用户消息创建新分支。可由 `session_before_fork` 扩展事件处理程序取消。返回所基于的消息文本。

```json
{"type": "fork", "entryId": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": false}
}
```

如果扩展取消了分支：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": true}
}
```

#### 克隆

将当前活动分支复制到新会话的当前位置。可由 `session_before_fork` 扩展事件处理程序取消。

```json
{"type": "clone"}
```

响应：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": false}
}
```

如果扩展取消了克隆：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": true}
}
```

#### get_fork_messages

获取可用于分叉的用户消息。

```json
{"type": "get_fork_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_fork_messages",
  "success": true,
  "data": {
    "messages": [
      {"entryId": "abc123", "text": "First prompt..."},
      {"entryId": "def456", "text": "Second prompt..."}
    ]
  }
}
```

#### get_entries

获取所有会话条目，按追加顺序排列，(不包括会话头)。会话是一个条目组成的append-only树，具有稳定的 ID ，因此条目 ID 可以作为持久光标：将您见过的最后一个条目 ID 作为`since`传递，以仅获取其后严格之后的条目，甚至跨客户端重启。与`get_messages`不同，这包括pre-compaction历史和废弃的分支。

```json
{"type": "get_entries"}
```

使用光标：
```json
{"type": "get_entries", "since": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "get_entries",
  "success": true,
  "data": {
    "entries": [
      {"type": "message", "id": "def456", "parentId": "abc123", "timestamp": "...", "message": {"role": "user", "...": "..."}}
    ],
    "leafId": "def456"
  }
}
```

`leafId`是当前叶子条目的 ID (`null`用于空会话)，因此客户端可以在一次往返中判断活动分支是否移动。如果`since`与任何条目 ID 都不匹配，则响应为`success: false`。

#### get_tree

将会话作为条目树获取。每个node is`{entry, children, label?, labelTimestamp?}`。一个well-formed会话有单个根；孤立条目(断开的父链)也作为根出现。

```json
{"type": "get_tree"}
```

响应：
```json
{
  "type": "response",
  "command": "get_tree",
  "success": true,
  "data": {
    "tree": [
      {
        "entry": {"type": "message", "id": "abc123", "parentId": null, "...": "..."},
        "children": [
          {"entry": {"type": "message", "id": "def456", "parentId": "abc123", "...": "..."}, "children": []}
        ]
      }
    ],
    "leafId": "def456"
  }
}
```

#### get_last_assistant_text

获取最后一条助手消息的文本内容。

```json
{"type": "get_last_assistant_text"}
```

响应：
```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": {"text": "The assistant's response..."}
}
```

如果不存在助手消息，则返回`{"text": null}`。

#### set_会话_name

为当前会话设置显示名称。该名称出现在会话列表中，有助于识别会话。

```json
{"type": "set_session_name", "name": "my-feature-work"}
```

响应：
```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

当前会话名称可通过`sessionName`字段中的`get_state`获得。要在启动RPC模式时设置初始名称，请将`--name <name>`或`-n <name>`传递给`pi --mode rpc`进程。

### 命令｜ Commands

#### get_commands

获取可用命令 (扩展命令、提示词模板和技能)。可以通过在`prompt`命令前加上`/`来调用它们。

```json
{"type": "get_commands"}
```

响应：
```json
{
  "type": "response",
  "command": "get_commands",
  "success": true,
  "data": {
    "commands": [
      {"name": "session-name", "description": "Set or clear session name", "source": "extension", "path": "/home/user/.pi/agent/extensions/session.ts"},
      {"name": "fix-tests", "description": "Fix failing tests", "source": "prompt", "location": "project", "path": "/home/user/myproject/.pi/agent/prompts/fix-tests.md"},
      {"name": "skill:brave-search", "description": "Web search via Brave API", "source": "skill", "location": "user", "path": "/home/user/.pi/agent/skills/brave-search/SKILL.md"}
    ]
  }
}
```

每个命令包含：
- `name`：命令名称 ( 使用 `/name` 调用)
- `description`：人类可读的描述 (扩展命令可选)
- `source`：命令类型：
  - `"extension"`：通过扩展中的 `pi.registerCommand()` 注册
  - `"prompt"`：从提示词模板 `.md` 文件加载
  - `"skill"`：从技能目录加载 (名称以 `skill:` 为前缀)
- `location`：加载来源 (可选，扩展不存在)：
  - `"user"`：用户级 (`~/.pi/agent/`)
  - `"project"`：项目级 (`./.pi/agent/`)
  - `"path"`：通过 CLI 或设置的显式路径
- `path`：命令源的绝对文件路径 (可选)

**注意**：内置 TUI 命令 (`/settings`、`/hotkeys` 等) 不包含在内。它们仅在交互模式下处理，如果通过 `prompt` 发送则不会执行。

## 事件｜ Events

在代理运行期间，事件以 JSON 流式传输到标准输出。事件通常不包含 `id` 字段；`bash_execution_update` 包含其来源 `bash` 命令的 `id`（如果提供了的话）。

### 事件类型｜ Event Types

| 事件｜ Event | 描述｜ Description |
|-------|-------------|
| `agent_start` | 代理开始处理 |
| `agent_end` | 一个 low-level 代理运行完成 (可能仍会被重试、上下文压缩或排队延续跟随) |
| `agent_settled` | 代理运行已完全稳定；不存在自动重试、上下文压缩重试或排队延续 |
| `turn_start` | 新回合开始 |
| `turn_end` | 回合完成 (包括助手消息和工具结果) |
| `message_start` | 消息开始 |
| `message_update` | 流式更新 (文本/思考/工具调用增量) |
| `message_end` | 消息完成 |
| `bash_execution_update` | 直接 RPC bash 命令输出块 |
| `tool_execution_start` | 工具开始执行 |
| `tool_execution_update` | 工具执行进度 (流式输出) |
| `tool_execution_end` | 工具完成 |
| `queue_update` | 待定转向/follow-up 队列已更改 |
| `compaction_start` | 上下文压缩开始 |
| `compaction_end` | 上下文压缩完成 |
| `auto_retry_start` | 自动重试开始 (在临时错误之后) |
| `auto_retry_end` | 自动重试完成 (成功或最终失败) |
| `summarization_retry_scheduled` | 为临时上下文压缩或 branch-summary 摘要错误安排重试 |
| `summarization_retry_attempt_start` | 重试的摘要请求开始 |
| `summarization_retry_finished` | 摘要重试循环完成 |
| `extension_error` | 扩展抛出错误 |

### 代理_开始

当代理开始处理提示时触发。

```json
{"type": "agent_start"}
```

### 代理_结束

当一次low-level代理运行完成时触发。包含此运行期间生成的所有消息。如果`willRetry`为 true ，将自动重试。

```json
{
  "type": "agent_end",
  "messages": [...],
  "willRetry": false
}
```

### 代理_已结束

当完整的session-level运行结束后触发。此时Pi将不会自动继续重试、压缩重试或排队的follow-up消息。

```json
{"type": "agent_settled"}
```

### 轮次_开始 / 轮次_结束

一个轮次包含一次助手响应以及由此产生的任何工具调用和结果。

```json
{"type": "turn_start"}
```

```json
{
  "type": "turn_end",
  "message": {...},
  "toolResults": [...]
}
```

### 消息_开始 / 消息_结束

当消息开始和完成时触发。`message`字段包含一个`AgentMessage`。

```json
{"type": "message_start", "message": {...}}
{"type": "message_end", "message": {...}}
```

### 消息_更新 (流式)

在助手消息流式传输期间触发。包含部分消息和流式增量事件。

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

`assistantMessageEvent`字段包含以下增量类型之一：

| 类型 | 描述 |
|------|-------------|
| `start` | 消息生成已开始 |
| `text_start` | 文本内容块开始 |
| `text_delta` | 文本内容块 |
| `text_end` | 文本内容块结束 |
| `thinking_start` | 思考块开始 |
| `thinking_delta` | 思考内容块 |
| `thinking_end` | 思考块结束 |
| `toolcall_start` | 工具调用开始 |
| `toolcall_delta` | 工具调用参数块 |
| `toolcall_end` | 工具调用结束 (包含完整的 `toolCall` 对象) |
| `done` | 消息完成 (原因：`"stop"`、`"length"`、`"toolUse"`) |
| `error` | 发生错误 (原因：`"aborted"`、`"error"`) |

示例：流式传输文本响应：
```json
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_start","contentIndex":0,"partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello","partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":" world","partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_end","contentIndex":0,"content":"Hello world","partial":{...}}}
```

### bash_执行_更新

对直接 `bash` 命令的每个输出块触发一次。`id` 匹配该命令的 `id`，允许客户端将输出与正确的命令关联起来。

事件会流式输出命令运行期间的所有输出，即使最终 `bash` 响应的 `output` 被截断。

```json
{
  "type": "bash_execution_update",
  "id": "req-1",
  "delta": "total 48\n"
}
```

### tool_execution_start / tool_execution_update / tool_execution_end

当工具开始执行、流式输出进度并完成执行时触发。

```json
{
  "type": "tool_execution_start",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": {"command": "ls -la"}
}
```

执行过程中，`tool_execution_update` 事件流式传输部分结果 (e.g。， bash 输出实时到达)：

```json
{
  "type": "tool_execution_update",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": {"command": "ls -la"},
  "partialResult": {
    "content": [{"type": "text", "text": "partial output so far..."}],
    "details": {"truncation": null, "fullOutputPath": null}
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

使用 `toolCallId` 关联事件。`tool_execution_update` 中的 `partialResult` 包含截至当前的累积输出 (而非增量)，客户端只需在每次更新时替换显示内容即可。

### queue_update

当待处理的 steering 或 follow-up 队列发生变化时触发。

```json
{
  "type": "queue_update",
  "steering": ["Focus on error handling"],
  "followUp": ["After that, summarize the result"]
}
```

### 上下文压缩_start / 上下文压缩_end

当执行上下文压缩（无论是手动还是自动）时触发。

```json
{"type": "compaction_start", "reason": "threshold"}
```

`reason` 字段的值为 `"manual"`、`"threshold"` 或 `"overflow"`。

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

如果 `reason` 为 `"overflow"` 且压缩成功，则 `willRetry` 为 `true`，代理将自动重试该提示词。

如果压缩被中止，则 `result` 为 `null`，`aborted` 为 `true`。

如果上下文压缩失败(e.g，API配额超出)，`result`为`null`，`aborted`为`false`，且`errorMessage`包含错误描述。

### auto_retry_start / auto_retry_end

当临时性错误 (过载、速率限制、5xx) 触发自动重试时触发。

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

最终失败 (超过最大重试次数) 时：
```json
{
  "type": "auto_retry_end",
  "success": false,
  "attempt": 3,
  "finalError": "529 overloaded_error: Overloaded"
}
```

### summarization_retry_scheduled / summarization_retry_attempt_start / summarization_retry_finished

当上下文压缩或 branch-summary 摘要因临时性模型提供商错误而重试时触发。这些事件使用与自动 assistant-turn 重试相同的重试设置。

```json
{
  "type": "summarization_retry_scheduled",
  "attempt": 1,
  "maxAttempts": 3,
  "delayMs": 2000,
  "errorMessage": "terminated"
}
```

```json
{
  "type": "summarization_retry_attempt_start",
  "source": "compaction",
  "reason": "threshold"
}
```

对于分支摘要，`source` 为 `"branchSummary"`，且不存在 `reason`。

```json
{
  "type": "summarization_retry_finished"
}
```

### 扩展_error

当扩展抛出错误时触发。

```json
{
  "type": "extension_error",
  "extensionPath": "/path/to/extension.ts",
  "event": "tool_call",
  "error": "Error message..."
}
```

## 扩展 UI Protocol

扩展可以通过 `ctx.ui.select()`、`ctx.ui.confirm()` 等方式请求用户交互。在 RPC 模式下，这些交互会被转换为基于基础命令/事件流之上的请求/响应 sub-protocol。

有两种扩展 UI 方法：

- **对话框方法** (`select`, `confirm`, `input`, `editor`)：在 stdout 上发送一个 `extension_ui_request`，并阻塞直到客户端在 stdin 上返回一个包含匹配的 `id` 的 `extension_ui_response`。
- **Fire-and-forget 方法** (`notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text`)：在 stdout 上发送一个 `extension_ui_request`，但不期望响应。客户端可以显示该信息或忽略它。

如果对话框方法包含 `timeout` 字段，则当超时时，agent-side 将 auto-resolve 一个默认值。客户端无需跟踪超时。

某些 `ExtensionUIContext` 方法在 RPC 模式下不受支持或降级，因为它们需要直接访问 TUI：
- `custom()` 返回 `undefined`
- `setWorkingMessage()`, `setWorkingIndicator()`, `setFooter()`, `setHeader()`, `setEditorComponent()`, `setToolsExpanded()` 是 no-ops
- `getEditorText()` 返回 `""`
- `getToolsExpanded()` 返回 `false`
- `pasteToEditor()` 委托给 `setEditorText()` (无粘贴/折叠处理)
- `getAllThemes()` 返回 `[]`
- `getTheme()` 返回 `undefined`
- `setTheme()` 返回 `{ success: false, error: "..." }`

注意：在 RPC 模式下，`ctx.mode` 是 `"rpc"`，`ctx.hasUI` 是 `true`，因为对话框和 fire-and-forget 方法通过扩展 UI sub-protocol 是有效的。使用 `ctx.mode === "tui"` 来保护需要真实终端的 TUI 特定功能，如 `custom()`。

### 扩展 UI 请求 (stdout)

所有请求都有 `type: "extension_ui_request"`、一个唯一的 `id` 和一个 `method` 字段。

#### select

提示用户从列表中选择。带有 `timeout` 字段的对话框方法包含超时时间（毫秒）；如果客户端未及时响应，代理 auto-resolves 带有 `undefined`。

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

预期响应：`extension_ui_response`，其中 `value` (选中的选项字符串) 或 `cancelled: true`。

#### confirm

提示用户进行是/否确认。

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

预期响应：`extension_ui_response`，其中 `confirmed: true/false` 或 `cancelled: true`。

#### input

提示用户输入 free-form 文本。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

预期的响应：`extension_ui_response` 包含 `value`(输入的文本) 或 `cancelled: true`。

#### 编辑器｜ editor

打开一个multi-line文本编辑器，可选预填充内容。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

预期的响应：`extension_ui_response` 包含 `value`(编辑后的文本) 或 `cancelled: true`。

#### 通知｜ notify

显示一条通知。Fire-and-forget，无需响应。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` 字段可以是 `"info"`、`"warning"` 或 `"error"`。如果省略，默认为 `"info"`。

#### setStatus

在页脚/状态栏中设置或清除一个状态条目。Fire-and-forget。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

发送 `statusText: undefined`(或省略它)来清除该键的状态条目。

#### setWidget

设置或清除一个显示在编辑器上方或下方的小部件(文本行块)。Fire-and-forget。

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

发送 `widgetLines: undefined`(或省略它)来清除小部件。`widgetPlacement` 字段可以是 `"aboveEditor"`(默认) 或 `"belowEditor"`。在RPC模式下仅支持字符串数组；组件工厂将被忽略。

#### setTitle

设置终端窗口/标签页标题。Fire-and-forget。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

#### set_editor_text

设置输入编辑器中的文本。Fire-and-forget。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

### 扩展 UI 响应｜扩展 UI Responses (stdin)

仅对对话框方法发送响应(`select`、`confirm`、`input`、`editor`)。`id` 必须与请求匹配。

#### 值响应｜ Value response (select, input, editor)

```json
{"type": "extension_ui_response", "id": "uuid-1", "value": "Allow"}
```

#### 确认响应｜ Confirmation response (confirm)

```json
{"type": "extension_ui_response", "id": "uuid-2", "confirmed": true}
```

#### 取消响应｜ Cancellation response (any dialog)

关闭任何对话框方法。扩展收到 `undefined`(用于 select/input/editor) 或 `false`(用于 confirm)。

```json
{"type": "extension_ui_response", "id": "uuid-3", "cancelled": true}
```

## 错误处理｜ Error Handling

失败的命令返回一个包含`success: false`的响应：

```json
{
  "type": "response",
  "command": "set_model",
  "success": false,
  "error": "Model not found: invalid/model"
}
```

解析错误：

```json
{
  "type": "response",
  "command": "parse",
  "success": false,
  "error": "Failed to parse command: Unexpected token..."
}
```

## 类型｜ Types

源文件：｜ Source files:
- [`packages/ai/src/types.ts`](../../ai/src/types.ts) - `Model`, `UserMessage`, `AssistantMessage`, `ToolResultMessage`
- [`packages/agent/src/types.ts`](../../agent/src/types.ts) - `AgentMessage`, `AgentEvent`
- [`src/core/messages.ts`](../src/core/messages.ts) - `BashExecutionMessage`
- [`src/modes/rpc/rpc-types.ts`](../src/modes/rpc/rpc-types.ts) - RPC 命令/响应类型，扩展 UI 请求/响应类型

### 模型｜ Model

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

`content`字段可以是字符串或由`TextContent`/`ImageContent`块组成的数组。

### AssistantMessage

```json
{
  "role": "assistant",
  "content": [
    {"type": "text", "text": "Hello! How can I help?"},
    {"type": "thinking", "thinking": "User is greeting me..."},
    {"type": "toolCall", "id": "call_123", "name": "bash", "arguments": {"command": "ls"}}
  ],
  "api": "anthropic-messages",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "usage": {
    "input": 100,
    "output": 50,
    "cacheRead": 0,
    "cacheWrite": 0,
    "cost": {"input": 0.0003, "output": 0.00075, "cacheRead": 0, "cacheWrite": 0, "total": 0.00105}
  },
  "stopReason": "stop",
  "timestamp": 1733234567890
}
```

停止原因：`"stop"`, `"length"`, `"toolUse"`, `"error"`, `"aborted"`

### ToolResultMessage

```json
{
  "role": "toolResult",
  "toolCallId": "call_123",
  "toolName": "bash",
  "content": [{"type": "text", "text": "total 48\ndrwxr-xr-x ..."}],
  "usage": {
    "input": 100,
    "output": 50,
    "cacheRead": 0,
    "cacheWrite": 0,
    "totalTokens": 150,
    "cost": {"input": 0.0003, "output": 0.00075, "cacheRead": 0, "cacheWrite": 0, "total": 0.00105}
  },
  "isError": false,
  "timestamp": 1733234567890
}
```

`usage`是可选的，并且报告工具执行的嵌套LLM工作。当存在时，它会计入会话令牌和成本总额。

### BashExecutionMessage

由`bash` RPC命令创建(而非由LLM工具调用)：

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

### 附件｜ Attachment

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

## 示例：基本客户端 (Python)

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

## 示例：交互式客户端 (Node.js)

查阅[`test/rpc-example.ts`](../test/rpc-example.ts)获取完整的交互式示例，或参考[`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts)以了解类型化客户端实现。

关于处理扩展 UI 协议的完整示例，请参见[`examples/rpc-extension-ui.ts`](../examples/rpc-extension-ui.ts)，该示例与[`examples/extensions/rpc-demo.ts`](../examples/extensions/rpc-demo.ts)扩展配对使用。

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
