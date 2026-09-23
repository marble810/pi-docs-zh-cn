# RPC 模式｜ Mode

RPC 模式将 Pi 作为 long-lived 子进程运行，通过 stdin 和 stdout 上的 JSON 记录进行控制。可将其用于 language-independent 集成、进程隔离、IDE 和自定义用户界面。

对于 in-process Node.js 或 Bun 集成，优先使用 [SDK](sdk.md)。对于 subprocess-based TypeScript 集成，优先使用导出的 `RpcClient`，它会启动 Pi、关联响应、暴露类型化的命令方法，并将事件传递给监听器。

| 接口｜ Interface | 进程边界｜ Process boundary | 控制模型｜ Control model | 最适用场景｜ Best fit |
|---|---|---|---|
| [SDK](sdk.md) | 进程内｜ In process | 直接使用 TypeScript 方法和事件 | 希望获得完整 API 访问权限的 Node.js 或 Bun 宿主 |
| RPC | 子进程｜ Child process | JSONL 命令、响应和事件 | 其他语言、隔离进程、IDE 或自定义客户端 |

## 启动 RPC 模式｜ Start mode

```bash
pi --mode rpc --no-session
```

常规的 CLI 选项仍用于选择工作文件夹、模型、工具、资源和会话行为。常见选项包括 `--provider`、`--model`、`--name`、`--no-session` 和 `--session-dir`。完整的 version-specific 接口请参见 [Command Line](cli.md)；对于已安装的版本，`pi --help` 是权威依据。

RPC 模式会拒绝 `@file` 提示词参数。请改为通过 [`prompt`](rpc-commands.md#prompt) 命令发送提示词。

## 协议记录｜ Protocol records

该协议包含四个记录族：

| 方向 | 记录 | 用途 |
|---|---|---|
| stdin | 命令 | 请求 Pi 发送提示词、检查状态、更改配置或管理会话 |
| stdout | `response` | 报告某条命令是否成功，并返回任何命令数据 |
| stdout | 会话事件 | 流式传输运行、消息、工具、队列、上下文压缩和重试活动 |
| 两者 | 扩展 UI 记录 | 在 Pi 与客户端之间转发受支持的扩展交互 |

规范的记录定义请参见 [RPC Commands](rpc-commands.md)、[JSON Event Stream](json.md) 和 [RPC 扩展 UI](rpc-extension-ui.md)。

### 关联命令与响应｜ Correlate commands and responses

每条命令都接受一个可选的字符串 `id`。匹配的响应会重复该值：

```json
{"id":"req-1","type":"get_state"}
{"id":"req-1","type":"response","command":"get_state","success":true,"data":{"...":"..."}}
```

只要可能有不止一条命令处于未完成状态，就应使用唯一 ID。命令处理是异步的，因此客户端应按 ID 而非响应顺序进行关联。

会话事件通常没有命令 ID ，因为它们描述的是会话活动。`bash_execution_update` 是例外：当发起它的 [`bash`](rpc-commands.md#bash) 命令带有 ID 时，其输出事件会重复该 ID。

`extension_ui_response` 使用其 `extension_ui_request` 提供的 ID。它不会产生普通的命令响应。

## 分帧｜ Framing

RPC 使用严格的 JSONL 分帧。每条记录写入一个完整的 JSON 对象，并以 LF (`\n`) 结尾。将 stdout 作为字节流或 UTF-8 流读取，并仅在 LF 处拆分记录。去除可选的前置回车符以接受 CRLF 输入。

不要使用将 Unicode 行分隔符或段落分隔符视为记录边界的通用行读取器。特别是，Node.js `readline` 也会在 `U+2028` 和 `U+2029` 处拆分，而这些字符在 JSON 字符串中是合法的。

持续读取 stdout。Pi 会遵循 stdout 背压，但停止读取的客户端可能导致进程停滞。写入命令时遵循 stdin 背压。stdout 保留用于协议记录；诊断信息和应用程序日志写入 stderr。

## 运行生命周期｜ Run lifecycle

成功的 `prompt` 响应意味着提示词已被接受、排队或处理。它并不意味着模型工作已完成：

```json
{"id":"req-2","type":"prompt","message":"Review this repository"}
{"id":"req-2","type":"response","command":"prompt","success":true}
```

在该响应之后继续消费 [events](json.md)。`agent_end` 标记一次 low-level 代理运行的结束，但重试、溢出恢复、上下文压缩、引导或 follow-up 工作仍可能随后发生。当客户端需要知道 Pi 不会自动继续时，等待 `agent_settled`。

在发送提示词之前订阅，以避免错过快速完成。`RpcClient.promptAndWait()` 在内部执行此操作。如果使用单独的 `RpcClient` 调用，请在 `prompt()` 之前安装事件监听器，并仅在运行处于活动状态时调用 `waitForIdle()`。

## 错误｜ Errors

失败的命令返回一个带有 `success: false` 的响应：

```json
{"id":"req-3","type":"response","command":"set_model","success":false,"error":"Model not found: invalid/model"}
```

格式错误的 JSON 会产生一个不带请求 ID 的解析响应：

```json
{"type":"response","command":"parse","success":false,"error":"Failed to parse command: Unexpected token..."}
```

成功响应仅涵盖命令处理。提示词被接受后的模型提供商故障和中止会出现在消息和事件流中。

客户端还必须处理 child-process 启动失败、意外退出、stderr 诊断、取消以及自身的截止时间。不要将 stderr 解析为协议数据。

## 关闭｜ Shutdown

关闭子进程的 stdin 以请求有序关闭。Pi 在退出前释放活动运行时。客户端仍应处理进程信号和意外退出。

扩展也可以通过其扩展上下文请求关闭。Pi 在当前命令完成后或活动运行发出 `agent_settled` 后完成关闭。

## 最小客户端｜ Minimal client

此 Python 示例使用二进制管道读取器，它在 LF 处拆分，而不将 Unicode 分隔符视为协议边界：

```python
import json
import subprocess

process = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
)

assert process.stdin is not None
assert process.stdout is not None

command = {"id": "prompt-1", "type": "prompt", "message": "Hello"}
process.stdin.write(json.dumps(command).encode("utf-8") + b"\n")
process.stdin.flush()

while line := process.stdout.readline():
    record = json.loads(line)
    if record.get("type") == "message_update":
        update = record["assistantMessageEvent"]
        if update["type"] == "text_delta":
            print(update["delta"], end="", flush=True)
    elif record.get("type") == "agent_settled":
        print()
        break

process.stdin.close()
process.wait()
```

对于维护中的 TypeScript 客户端，请使用已检出的 [RPC 客户端示例](../examples/rpc-client.ts)。它需要已构建的 Pi CLI，因为仓库示例指向 `dist/cli.js`。

## 参考｜ Reference

- [RPC Commands](rpc-commands.md)：每个 stdin 命令和响应
- [JSON Event Stream](json.md)：共享 stdout 会话事件和流式重建
- [RPC 扩展 UI](rpc-extension-ui.md)：对话框、通知、响应和限制
- [消息类型](message-types.md)：响应和事件使用的消息与内容块
- [会话文件格式](session-format.md)：会话命令返回的条目
- [`rpc-types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-types.ts)：导出的 TypeScript 协议定义
- [`RpcClient`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-client.ts)：子进程客户端实现

## 已移动的参考锚点｜ Moved reference anchors

原先位于此页面的详细参考内容现在已有专门的页面。这些锚点用于保留现有链接。

<a id="prompt"></a>
<a id="steer"></a>
<a id="follow_up"></a>
<a id="abort"></a>
<a id="clear_queue"></a>
<a id="new_session"></a>
<a id="get_state"></a>
<a id="get_messages"></a>
<a id="set_model"></a>
<a id="cycle_model"></a>
<a id="get_available_models"></a>
<a id="set_thinking_level"></a>
<a id="cycle_thinking_level"></a>
<a id="get_available_thinking_levels"></a>
<a id="set_steering_mode"></a>
<a id="set_follow_up_mode"></a>
<a id="compact"></a>
<a id="set_auto_compaction"></a>
<a id="set_auto_retry"></a>
<a id="abort_retry"></a>
<a id="bash"></a>
<a id="abort_bash"></a>
<a id="get_session_stats"></a>
<a id="export_html"></a>
<a id="switch_session"></a>
<a id="fork"></a>
<a id="clone"></a>
<a id="get_fork_messages"></a>
<a id="get_entries"></a>
<a id="get_tree"></a>
<a id="get_last_assistant_text"></a>
<a id="set_session_name"></a>
<a id="get_commands"></a>

命令详情已移至 [RPC Commands](rpc-commands.md)。

<a id="message_update-streaming"></a>
<a id="bash_execution_update"></a>
<a id="compaction_start--compaction_end"></a>
<a id="summarization_retry_scheduled--summarization_retry_attempt_start--summarization_retry_finished"></a>

事件详情已移至 [JSON Event Stream](json.md)。

<a id="extension-ui-protocol"></a>

扩展交互详情已移至 [RPC 扩展 UI](rpc-extension-ui.md)。
