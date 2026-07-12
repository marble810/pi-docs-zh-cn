# RPC 模式

RPC 模式通过 stdin/stdout 上的 JSON 协议启用编程代理的无界面操作。这对于将代理嵌入其他应用程序、IDE 或自定义 UI 非常有用。

**Node.js/TypeScript 用户请注意**：如果您正在构建 Node.js 应用程序，请考虑直接使用 `@earendil-works/pi-coding-agent` 中的 `AgentSession`，而不是生成子进程。有关 API，请参阅 [`src/core/agent-session.ts`](../src/core/agent-session.ts)。有关 subprocess-based TypeScript 客户端，请参阅 [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts)。

## 启动 RPC 模式

```bash
pi --mode rpc [options]
```

常用选项：

- `--provider <name>`：设置 LLM 提供商 (anthropic、openai、google 等)
- `--model <pattern>`：模型模式或 ID (支持 `provider/id` 和可选的 `:<thinking>`)
- `--name <name>` / `-n <name>`：在启动时设置会话显示名称
- `--no-session`：禁用会话持久化
- `--session-dir <path>`：自定义会话存储目录

## 协议概述

- **命令**：发送到 stdin 的 JSON 对象，每行一个
- **响应**：带有 `type: "response"` 的 JSON 对象，指示命令成功/失败
- **事件**：代理事件以JSON行形式流式输出到标准输出

所有命令都支持可选的`id`字段用于请求/响应关联。若提供，对应的响应将包含相同的`id`。

### 帧格式

RPC模式使用严格的JSONL语义，仅以 LF (`\n`)作为记录分隔符。

这对客户端很重要：

- 仅按`\n`分割记录
- 通过去除尾随的`\r`来接受可选的`\r\n`输入
- 不要使用将 Unicode 分隔符视为换行符的通用行读取器

特别地， Node 的`readline`对于RPC模式不protocol-compliant，因为它还会按`U+2028`和`U+2029`分割，而这些在JSON字符串中是有效的。

## 命令

### 提示

#### prompt

向代理发送用户提示。命令响应在提示被接受、排队或被处理后发出。接受后事件继续异步流式传输。

```json
{ "id": "req-1", "type": "prompt", "message": "Hello, world!" }
```

带有图片：

```json
{
  "type": "prompt",
  "message": "What's in this image?",
  "images": [{ "type": "image", "data": "base64-encoded-data", "mimeType": "image/png" }]
}
```

**在流式传输期间**：如果代理已在流式传输，必须指定`streamingBehavior`来排队消息：

```json
{ "type": "prompt", "message": "New instruction", "streamingBehavior": "steer" }
```

- `"steer"`：在代理运行时排队消息。消息在当前助手轮次完成其工具调用后、下一次LLM调用前传递。
- `"followUp"`：等待代理完成。仅在代理停止时传递消息。

如果代理正在流式传输且未指定`streamingBehavior`，命令返回错误。

**扩展命令**：如果消息是扩展命令(e.g., `/mycommand`)，即使在流式传输期间也会立即执行。扩展命令通过`pi.sendMessage()`管理自己的LLM交互。

**输入展开**：技能命令(`/skill:name`)和提示模板(`/template`)在发送/排队前展开。

响应：

```json
{ "id": "req-1", "type": "response", "command": "prompt", "success": true }
```

`success: true`表示提示被立即接受、排队或处理。`success: false`表示提示在接受前被拒绝。接受后的失败通过正常的事件和消息流报告，而不是作为同一请求 id 的第二个`response`。

`images` 字段为可选。每张图片使用 `ImageContent` 格式：`{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`。

#### 引导

在代理运行时排队发送一条引导消息。该消息会在当前助手回合完成其工具调用后、下一次 LLM 调用前送达。技能命令和提示词模板会被展开。不允许使用扩展命令 (请改用 `prompt`)。

```json
{ "type": "steer", "message": "Stop and do this instead" }
```

附带图片：

```json
{
  "type": "steer",
  "message": "Look at this instead",
  "images": [{ "type": "image", "data": "base64-encoded-data", "mimeType": "image/png" }]
}
```

`images` 字段为可选。每张图片使用 `ImageContent` 格式 (与 `prompt` 相同)。

响应：

```json
{ "type": "response", "command": "steer", "success": true }
```

有关如何控制引导消息处理方式的说明，请参阅 [set_steering_mode](#set_steering_mode)。

#### follow_up

排队发送一条 follow-up 消息，在代理完成后处理。仅当代理没有更多工具调用或引导消息时才会送达。技能命令和提示词模板会被展开。不允许使用扩展命令 (请改用 `prompt`)。

```json
{ "type": "follow_up", "message": "After you're done, also do this" }
```

附带图片：

```json
{
  "type": "follow_up",
  "message": "Also check this image",
  "images": [{ "type": "image", "data": "base64-encoded-data", "mimeType": "image/png" }]
}
```

`images` 字段为可选。每张图片使用 `ImageContent` 格式 (与 `prompt` 相同)。

响应：

```json
{ "type": "response", "command": "follow_up", "success": true }
```

有关如何控制 follow-up 消息处理方式的说明，请参阅 [set_follow_up_mode](#set_follow_up_mode)。

#### abort

中止当前的代理操作。

```json
{ "type": "abort" }
```

响应：

```json
{ "type": "response", "command": "abort", "success": true }
```

#### new_会话

开始一个新的会话。可以被 `session_before_switch` 扩展事件处理器取消。

```json
{ "type": "new_session" }
```

附带可选的父会话追踪：

```json
{ "type": "new_session", "parentSession": "/path/to/parent-session.jsonl" }
```

响应：

```json
{ "type": "response", "command": "new_session", "success": true, "data": { "cancelled": false } }
```

如果扩展取消了操作：

```json
{ "type": "response", "command": "new_session", "success": true, "data": { "cancelled": true } }
```

### 状态

#### get_state

获取当前会话状态。

```json
{ "type": "get_state" }
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

获取会话中的所有消息。

```json
{ "type": "get_messages" }
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

消息为 `AgentMessage` 对象 (参见 [消息类型](#message-types))。

### 模型

#### set_model

切换到指定模型。

```json
{ "type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514" }
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

循环切换到下一个可用模型。如果只有一个模型可用，则返回 `null` 数据。

```json
{ "type": "cycle_model" }
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
{ "type": "get_available_models" }
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

### 思考

#### set_thinking_level

为支持该功能的模型设置推理/思考级别。

```json
{ "type": "set_thinking_level", "level": "high" }
```

级别：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`

`"xhigh"` 和 `"max"` 仅在所选模型支持时才会暴露。某些模型（包括 GPT-5.6 ）会同时暴露两者。

响应：

```json
{ "type": "response", "command": "set_thinking_level", "success": true }
```

#### cycle_thinking_level

循环切换可用的思考级别。如果模型不支持思考，则返回 `null` 数据。

```json
{ "type": "cycle_thinking_level" }
```

响应：

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

控制来自 `steer` 的引导消息 ( 的传递方式)。

```json
{ "type": "set_steering_mode", "mode": "one-at-a-time" }
```

模式：

- `"all"`：在当前助手回合完成执行其工具调用后，传递所有引导消息
- `"one-at-a-time"`：每个完成的助手回合传递一条引导消息 (默认)

响应：

```json
{ "type": "response", "command": "set_steering_mode", "success": true }
```

#### set_follow_up_mode

控制来自 `follow_up` 的 follow-up 消息 ( 的传递方式)。

```json
{ "type": "set_follow_up_mode", "mode": "one-at-a-time" }
```

模式：

- `"all"`：在代理完成时传递所有 follow-up 消息
- `"one-at-a-time"`：每次代理完成时传递一条 follow-up 消息 (默认)

响应：

```json
{ "type": "response", "command": "set_follow_up_mode", "success": true }
```

### 上下文压缩

#### compact

手动压缩对话上下文以减少令牌用量。

```json
{ "type": "compact" }
```

使用自定义指令：

```json
{ "type": "compact", "customInstructions": "Focus on code changes" }
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
    "details": {}
  }
}
```

`estimatedTokensAfter` 是对压缩后立即重建的消息上下文的启发式估算，并非 provider-exact 令牌计数。

#### set_auto_上下文压缩

启用或禁用在上下文接近满载时的自动压缩。

```json
{ "type": "set_auto_compaction", "enabled": true }
```

响应：

```json
{ "type": "response", "command": "set_auto_compaction", "success": true }
```

### 重试

#### set_auto_retry

启用或禁用针对瞬时错误 (（过载、速率限制、5xx ）) 的自动重试。

```json
{ "type": "set_auto_retry", "enabled": true }
```

响应：

```json
{ "type": "response", "command": "set_auto_retry", "success": true }
```

#### abort_retry

中止 in-progress 重试 (（取消延迟并停止重试）)。

```json
{ "type": "abort_retry" }
```

响应：

```json
{ "type": "response", "command": "abort_retry", "success": true }
```

### Bash

#### bash

执行 shell 命令并将输出添加到对话上下文中。

```json
{ "type": "bash", "command": "ls -la" }
```

响应：

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

**Bash 结果如何到达 LLM：**

`bash` 命令会立即执行并返回一个 `BashResult`。在内部，会创建一个 `BashExecutionMessage` 并存储在代理的消息状态中。该消息 NOT 发出一个事件。

当下一个 `prompt` 命令被发送时，所有消息 (（包括 `BashExecutionMessage`）) 在发送到 LLM 之前都会被转换。`BashExecutionMessage` 被转换为具有以下格式的 `UserMessage`：

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

这意味着：

1. Bash 输出包含在 LLM 上下文中，**在下一个提示词时**，而非立即
2. 可以在一个提示词之前执行多个 bash 命令；所有输出都将被包含
3. `BashExecutionMessage` 本身不会发出事件

#### abort_bash

中止正在运行的 bash 命令。

```json
{ "type": "abort_bash" }
```

响应：

```json
{ "type": "response", "command": "abort_bash", "success": true }
```

### 会话

#### get_会话_stats

获取令牌使用量、成本统计信息以及当前上下文窗口使用情况。

```json
{ "type": "get_session_stats" }
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

`tokens` 包含当前会话状态的助手用量总计。`contextUsage` 包含用于上下文压缩和页脚显示的实际当前 context-window 估算值。

当没有模型或上下文窗口可用时，`contextUsage` 会被省略。在上下文压缩后，`contextUsage.tokens` 和 `contextUsage.percent` 会立即变为 `null`，直到新的 post-compaction 助手响应提供有效的用量数据。

#### export_html

将会话导出为 HTML 文件。

```json
{ "type": "export_html" }
```

使用自定义路径：

```json
{ "type": "export_html", "outputPath": "/tmp/session.html" }
```

响应：

```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": { "path": "/tmp/session.html" }
}
```

#### switch_会话

加载不同的会话文件。可以被 `session_before_switch` 扩展事件处理器取消。

```json
{ "type": "switch_session", "sessionPath": "/path/to/session.jsonl" }
```

响应：

```json
{ "type": "response", "command": "switch_session", "success": true, "data": { "cancelled": false } }
```

如果扩展取消了切换：

```json
{ "type": "response", "command": "switch_session", "success": true, "data": { "cancelled": true } }
```

#### fork

从活动分支上的一条先前用户消息创建一个新的分支。可以被 `session_before_fork` 扩展事件处理器取消。返回被分支来源消息的文本。

```json
{ "type": "fork", "entryId": "abc123" }
```

响应：

```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": { "text": "The original prompt text...", "cancelled": false }
}
```

如果扩展取消了分支操作：

```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": { "text": "The original prompt text...", "cancelled": true }
}
```

#### clone

将当前活动分支复制到当前位置的一个新会话中。可以被 `session_before_fork` 扩展事件处理器取消。

```json
{ "type": "clone" }
```

响应：

```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": { "cancelled": false }
}
```

如果扩展取消了克隆操作：

```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": { "cancelled": true }
}
```

#### get_fork_messages

获取可用于分支的用户消息。

```json
{ "type": "get_fork_messages" }
```

响应：

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

#### get_entries

按追加顺序获取所有会话条目，(不包括会话头)。会话是一个具有稳定 ID 的append-only条目树，因此条目 ID 可作为持久游标：将您已看到的最后一个条目 ID 作为`since`传入，以仅获取严格在该 ID 之后的条目，即使在客户端重启后也如此。与`get_messages`不同，这包括pre-compaction历史记录和废弃分支。

```json
{ "type": "get_entries" }
```

使用游标：

```json
{ "type": "get_entries", "since": "abc123" }
```

响应：

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

`leafId` 是当前叶子条目的 ID(空会话时为 `null`)，这样客户端就能在一次往返中判断活动分支是否发生了移动。如果 `since` 与任何条目 ID 都不匹配，则响应为 `success: false`。

#### get_tree

将会话作为条目树获取。每个node is `{entry, children, label?, labelTimestamp?}`。well-formed会话有一个根节点；孤立条目(断裂的父链)也会作为根节点出现。

```json
{ "type": "get_tree" }
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

#### get_last_assistant_text

获取最后一条代理消息的文本内容。

```json
{ "type": "get_last_assistant_text" }
```

响应：

```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": { "text": "The assistant's response..." }
}
```

如果不存在代理消息，则返回 `{"text": null}`。

#### set_会话_name

为当前会话设置一个显示名称。该名称会出现在会话列表中，有助于识别会话。

```json
{ "type": "set_session_name", "name": "my-feature-work" }
```

响应：

```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

当前会话名称可通过 `sessionName` 字段中的 `get_state` 获取。要在启动 RPC 模式时设置初始名称，请向 `pi --mode rpc` 进程传递 `--name <name>` 或 `-n <name>`。

### 命令

#### get_commands

获取可用命令(扩展命令、提示词模板和技能)。这些可以通过`prompt`命令调用，前缀为`/`。

```json
{ "type": "get_commands" }
```

响应：

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

- `name`：命令名称(使用 `/name` 调用)
- `description`：人类可读的描述(扩展命令可选)
- `source`：命令类型：
  - `"extension"`：通过扩展中的 `pi.registerCommand()` 注册
  - `"prompt"`：从提示词模板 `.md` 文件加载
  - `"skill"`：从技能目录加载(名称带有 `skill:` 前缀)
- `location`：加载来源(可选，扩展不显示此项)：
  - `"user"`：用户级 (`~/.pi/agent/`)
  - `"project"`：项目级 (`./.pi/agent/`)
  - `"path"`：通过 CLI 或设置指定的显式路径
- `path`：命令源的绝对文件路径(可选)

**注意**：内置的 TUI 命令(`/settings`、`/hotkeys` 等)不包含在内。它们仅在交互模式下处理，如果通过 `prompt` 发送则不会执行。

## 事件

代理运行期间，事件以 JSON 行的形式流式输出到 stdout。事件 NOT 包含 `id` 字段 (仅响应才包含)。

### 事件类型

| 事件                    | 描述                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `agent_start`           | 代理开始处理                                                         |
| `agent_end`             | 一次 low-level 代理运行完成 (可能仍会进行重试、上下文压缩或排队继续) |
| `agent_settled`         | 代理运行完全结束；没有自动重试、上下文压缩重试或排队继续             |
| `turn_start`            | 新一轮开始                                                           |
| `turn_end`              | 轮次完成 (包含助手消息和工具结果)                                    |
| `message_start`         | 消息开始                                                             |
| `message_update`        | 流式更新 (文本/思考/工具调用的增量)                                  |
| `message_end`           | 消息完成                                                             |
| `tool_execution_start`  | 工具开始执行                                                         |
| `tool_execution_update` | 工具执行进度 (流式输出)                                              |
| `tool_execution_end`    | 工具完成                                                             |
| `queue_update`          | 待处理的 steering/follow-up 队列已更改                               |
| `compaction_start`      | 上下文压缩开始                                                       |
| `compaction_end`        | 上下文压缩完成                                                       |
| `auto_retry_start`      | 自动重试开始 (在发生暂时性错误后)                                    |
| `auto_retry_end`        | 自动重试完成 (成功或最终失败)                                        |
| `extension_error`       | 扩展抛出了错误                                                       |

### 代理_start

当代理开始处理提示词时发出。

```json
{ "type": "agent_start" }
```

### 代理_end

当一次 low-level 代理运行完成时发出。包含此次运行期间生成的所有消息。如果 `willRetry` 为 true ，将自动进行重试。

```json
{
  "type": "agent_end",
  "messages": [...],
  "willRetry": false
}
```

### 代理_settled

在完整的 session-level 运行结束后发出。此时 Pi 不会通过重试、压缩重试或排队的 follow-up 消息自动继续。

```json
{ "type": "agent_settled" }
```

### turn_start / turn_end

一个回合包含一次代理响应以及由此产生的所有工具调用和结果。

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

在消息开始和完成时发出。`message` 字段包含一个 `AgentMessage`。

```json
{"type": "message_start", "message": {...}}
{"type": "message_end", "message": {...}}
```

### message_update (流式)

在代理消息流式传输期间发出。同时包含部分消息和流式增量事件。

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

`assistantMessageEvent` 字段包含以下增量类型之一：

| 类型             | 描述                                               |
| ---------------- | -------------------------------------------------- |
| `start`          | 消息生成已开始                                     |
| `text_start`     | 文本内容块已开始                                   |
| `text_delta`     | 文本内容片段                                       |
| `text_end`       | 文本内容块已结束                                   |
| `thinking_start` | 思考块已开始                                       |
| `thinking_delta` | 思考内容片段                                       |
| `thinking_end`   | 思考块已结束                                       |
| `toolcall_start` | 工具调用已开始                                     |
| `toolcall_delta` | 工具调用参数块                                     |
| `toolcall_end`   | 工具调用结束 (包含完整的 `toolCall` 对象)          |
| `done`           | 消息完成 (原因：`"stop"`、`"length"`、`"toolUse"`) |
| `error`          | 发生错误 (原因：`"aborted"`、`"error"`)            |

流式传输文本响应的示例：

```json
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_start","contentIndex":0,"partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello","partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":" world","partial":{...}}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_end","contentIndex":0,"content":"Hello world","partial":{...}}}
```

### tool_execution_start / tool_execution_update / tool_execution_end

在工具开始执行、流式传输进度以及完成执行时发出。

```json
{
  "type": "tool_execution_start",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": { "command": "ls -la" }
}
```

在执行期间，`tool_execution_update` 事件会流式传输部分结果 (e.g。、bash 输出等)：

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

使用 `toolCallId` 来关联事件。`tool_execution_update` 中的 `partialResult` 包含到目前为止累积的输出 (而不仅仅是增量)，允许客户端在每次更新时直接替换其显示内容。

### queue_update

每当待处理的 steering 或 follow-up 队列发生变化时发出。

```json
{
  "type": "queue_update",
  "steering": ["Focus on error handling"],
  "followUp": ["After that, summarize the result"]
}
```

### 上下文压缩_start / 上下文压缩_end

在上下文压缩运行时发出，无论是手动还是自动触发。

```json
{ "type": "compaction_start", "reason": "threshold" }
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
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

如果 `reason` 为 `"overflow"` 且上下文压缩成功，则 `willRetry` 为 `true`，代理将自动重试提示词。

如果上下文压缩被中止，则 `result` 为 `null`，`aborted` 为 `true`。

如果上下文压缩失败 (e.g。、API 配额超出)，则 `result` 为 `null`，`aborted` 为 `false`，`errorMessage` 包含错误描述。

### auto_retry_start / auto_retry_end

在发生瞬时错误 (过载、速率限制、5xx) 后触发自动重试时发出。

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

最终失败时 (超过最大重试次数)：

```json
{
  "type": "auto_retry_end",
  "success": false,
  "attempt": 3,
  "finalError": "529 overloaded_error: Overloaded"
}
```

### 扩展_错误

当扩展抛出错误时发出。

```json
{
  "type": "extension_error",
  "extensionPath": "/path/to/extension.ts",
  "event": "tool_call",
  "error": "Error message..."
}
```

## 扩展 UI 协议

扩展可以通过 `ctx.ui.select()`、`ctx.ui.confirm()` 等方式请求用户交互。在 RPC 模式下，这些交互会在基础命令/事件流之上转换为请求/响应 sub-protocol。

扩展 UI 方法分为两类：

- **对话框方法** (`select`、`confirm`、`input`、`editor`)：在 stdout 上发出 `extension_ui_request`，并阻塞直到客户端通过 stdin 发回带有匹配 `id` 的 `extension_ui_response`。
- **即发-and-forget方法** (`notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text`)：在 stdout 上发出 `extension_ui_request`，但不期望响应。客户端可以显示信息或忽略它。

如果对话框方法包含 `timeout` 字段，agent-side 将在超时到期时 auto-resolve 一个默认值。客户端无需跟踪超时。

某些 `ExtensionUIContext` 方法在 RPC 模式下不受支持或功能降级，因为它们需要直接 TUI 访问：

- `custom()` 返回 `undefined`
- `setWorkingMessage()`、`setWorkingIndicator()`、`setFooter()`、`setHeader()`、`setEditorComponent()`、`setToolsExpanded()` 为 no-ops
- `getEditorText()` 返回 `""`
- `getToolsExpanded()` 返回 `false`
- `pasteToEditor()` 委托给 `setEditorText()` (无粘贴/折叠处理)
- `getAllThemes()` 返回 `[]`
- `getTheme()` 返回 `undefined`
- `setTheme()` 返回 `{ success: false, error: "..." }`

注意：在 RPC 模式下，`ctx.mode` 为 `"rpc"`，`ctx.hasUI` 为 `true`，因为对话框和 fire-and-forget 方法通过扩展 UI sub-protocol 可用。使用 `ctx.mode === "tui"` 来保护 TUI 特定功能，例如需要真实终端的 `custom()`。

### 扩展 UI 请求 (stdout)

所有请求都有 `type: "extension_ui_request"`、唯一的 `id` 和 `method` 字段。

#### select

提示用户从列表中选择。带有 `timeout` 字段的对话框方法包含以毫秒为单位的超时时间；如果客户端未及时响应，代理将 auto-resolves 并返回 `undefined`。

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

期望的响应：带有 `value` (所选选项字符串) 或 `cancelled: true` 的 `extension_ui_response`。

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

期望的响应：`extension_ui_response`，其中包含 `confirmed: true/false` 或 `cancelled: true`。

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

期望的响应：`extension_ui_response`，其中包含 `value` (输入的文本) 或 `cancelled: true`。

#### editor

打开一个 multi-line 文本编辑器，可包含预填充内容。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

期望的响应：`extension_ui_response`，其中包含 `value` (编辑后的文本) 或 `cancelled: true`。

#### notify

显示一条通知。即发即弃（and-forget），不期望响应。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` 字段为 `"info"`、`"warning"` 或 `"error"`。如果省略，则默认为 `"info"`。

#### setStatus

在页脚/状态栏中设置或清除一个状态条目。即发即弃（and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

发送 `statusText: undefined` (或省略它) 以清除该键对应的状态条目。

#### setWidget

设置或清除一个显示在编辑器上方或下方的小部件 (文本行块)。即发即弃（and-forget）。

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

发送 `widgetLines: undefined` (或将其省略) 以清除该小部件。`widgetPlacement` 字段为 `"aboveEditor"` (default) 或 `"belowEditor"`。在 RPC 模式下仅支持字符串数组；组件工厂将被忽略。

#### setTitle

设置终端窗口/标签页标题。即发即弃（and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

#### set_editor_text

设置输入编辑器中的文本。即发即弃（and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

### 扩展 UI 响应 (stdin)

仅对对话框方法 (`select`、`confirm`、`input`、`editor`) 发送响应。`id` 必须与请求匹配。

#### 值响应 (select、input、editor)

```json
{ "type": "extension_ui_response", "id": "uuid-1", "value": "Allow" }
```

#### 确认响应 (confirm)

```json
{ "type": "extension_ui_response", "id": "uuid-2", "confirmed": true }
```

#### 取消响应 (任意对话框)

关闭任意对话框的方法。扩展会收到 `undefined` (（用于 select/input/editor ）) 或 `false` (（用于 confirm ）)。

```json
{ "type": "extension_ui_response", "id": "uuid-3", "cancelled": true }
```

## 错误处理

失败的命令会返回一个带有 `success: false` 的响应：

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

## 类型

源文件：

- [`packages/ai/src/types.ts`](../../ai/src/types.ts) - `Model`、`UserMessage`、`AssistantMessage`、`ToolResultMessage`
- [`packages/agent/src/types.ts`](../../agent/src/types.ts) - `AgentMessage`、`AgentEvent`
- [`src/core/messages.ts`](../src/core/messages.ts) - `BashExecutionMessage`
- [`src/modes/rpc/rpc-types.ts`](../src/modes/rpc/rpc-types.ts) - RPC 命令/响应类型、扩展 UI 请求/响应类型

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

`content` 字段可以是一个字符串，也可以是一个由 `TextContent`/`ImageContent` 块组成的数组。

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

停止原因：`"stop"`、`"length"`、`"toolUse"`、`"error"`、`"aborted"`

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

由 `bash` RPC 命令创建 (，而非由 LLM 工具调用创建)：

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

### Attachment

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

## 示例：基础客户端 (Python)

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

完整的交互式示例请参见 [`test/rpc-example.ts`](../test/rpc-example.ts)，类型化客户端实现请参见 [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts)。

处理扩展 UI 协议的完整示例请参见 [`examples/rpc-extension-ui.ts`](../examples/rpc-extension-ui.ts)，该示例与 [`examples/extensions/rpc-demo.ts`](../examples/extensions/rpc-demo.ts) 扩展配对使用。

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
