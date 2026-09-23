# CLI 集成｜ Integration

默认情况下，运行 `pi` 会打开交互式终端界面。当输入或输出被管道传输或重定向时，Pi 会改用打印模式。你也可以为脚本和应用程序显式选择打印模式、JSON 或 RPC 模式。

所有四种模式都使用相同的代理、会话、资源和工具。模式决定了输入如何进入 Pi、输出如何暴露，以及进程是否保持可用以接收更多命令。

SDK 不是一种 CLI 模式。它将代理直接嵌入到 Node.js 或 Bun 进程中。当直接访问 TypeScript 比进程边界更可取时，请参阅 [SDK](sdk.md)。

## 选择模式｜ Choose a mode

| 模式 | 界面 | 生命周期 | 适用场景 |
|---|---|---|---|
| 交互式 | 终端 UI | 直到用户退出 | 用户直接使用 Pi |
| 打印 | stdout 上的最终文本 | 单次调用 | 脚本需要最终的助手响应 |
| JSON | stdout 上的 JSONL 事件 | 单次调用 | 进程需要一次运行的结构化进度 |
| RPC | JSONL 命令、响应和事件 | 长期运行 | 进程需要双向控制 |

CLI 选项仍会独立于模式选择工作目录、模型、工具、资源和会话持久化。完整的启动选项请参见 [Command Line](cli.md)。

## 打印到 stdout

打印模式运行提供的提示词，将最终的助手文本写入 stdout ，然后退出：

```bash
pi --print "Summarize the changes in this repository"
```

当只需要最终文本时使用打印模式，包括命令替换、管道和 one-shot 作业。中间事件不会暴露。

打印模式将错误写入 stderr。带有 `error` 或 `aborted` 停止原因的最终助手响应会产生非零退出状态。

当未显式选择模式时，非 TTY 的 stdin 或 stdout 也会选择打印模式。这允许在无需添加 `--print` 的情况下进行管道输入和输出。

## 流式输出 JSON 事件

JSON 模式写入会话头，随后以 newline-delimited JSON 的形式写入代理和会话事件：

```bash
pi --mode json "Review this repository" > events.jsonl
```

这是结构化事件输出，而不是单个 JSON 结果，也不是对模型响应格式的约束。

所有提示词在进程启动时提供。进程为该次运行流式输出事件，然后退出；它不接受后续命令。

失败或中止的助手响应会出现在事件流中，但其本身不会产生非零退出状态。当成功或失败很重要时，请检查事件。如果调用抛出错误，Pi 仍会以非零状态退出。

流式 `message_update` 记录包含增量，而不是不断增长的消息快照。从增量事件组装实时输出，然后用来自 `message_end` 的权威消息替换它。

`agent_end` 之后可能跟随自动恢复或排队的工作。`agent_settled` 标记当前运行的自动工作结束。

Stdout 保留给 JSONL。诊断信息和应用程序日志写入 stderr。有关帧格式、事件结构和重建规则，请参见 [JSON Event Stream](json.md)。

## 使用 RPC 控制 Pi

RPC 模式让 Pi 保持运行，同时另一个进程发送命令并接收响应和事件：

```bash
pi --mode rpc --no-session
```

命令是写入 stdin 的 JSON 对象。响应和事件是写入 stdout 的 JSON 对象。每条记录占一行。

为需要关联的命令添加 `id`。匹配的响应会重复该 ID。事件通常没有命令 ID ，因为它们描述的是会话活动而不是单个请求。

成功的 `prompt` 响应意味着提示词已被接受、排队或处理。它并不意味着运行已完成。当完成很重要时，请继续通过 `agent_settled` 消费事件。

RPC 命令可以更改模型、检查状态、管理会话、运行 shell 命令，以及应答扩展 UI 请求。

扩展对话框构成一个 request-response 子协议。其他扩展 UI 更新是客户端可以显示或忽略的通知。仅 TUI 的扩展能力在交互模式之外不可用或降级。

对于 Node.js 或 TypeScript 集成，优先使用 `@earendil-works/pi-coding-agent` 中的 `RpcClient`。它会启动一个 Pi RPC 子进程，关联请求，暴露类型化的命令方法，并将会话事件传递给监听器。

[RPC 客户端示例](../examples/rpc-client.ts) 发送一个提示词，流式传输文本和工具活动，等待 `agent_settled`，然后关闭子进程。它包含在仓库的 TypeScript 检查中。

`RpcClient.promptAndWait()` 在发送提示词之前安装其事件监听器，避免与快速完成产生竞态。对于独立操作，请在调用 `prompt()` 之前订阅，并且仅在运行处于活动状态时调用 `waitForIdle()`。

客户端需要一个可运行的 Pi CLI 的路径。仓库示例指向 `dist/cli.js`，因此从检出运行该示例之前必须先构建该包。

如果你要在不使用 `RpcClient` 的情况下构建客户端，请从 [RPC Protocol](rpc.md) 开始，然后使用 [RPC Commands](rpc-commands.md) 和 [JSON Event Stream](json.md) 作为通信协议参考。

## 复刻并重命名 Pi｜ Fork and rebrand 

source fork 可以通过 `package.json` 更改 CLI 名称和配置目录：

```json
{
  "piConfig": {
    "name": "my-agent",
    "configDir": ".my-agent"
  }
}
```

更改 top-level `bin` 字段以设置可执行文件名称。这些设置会影响 CLI 横幅、配置路径以及派生的环境变量名称。

## 示例与参考｜ Examples and references

- [RPC 客户端](../examples/rpc-client.ts)：类型化的 Node.js 集成
- [RPC 扩展 UI](../examples/rpc-extension-ui.ts)：带扩展对话框的自定义终端客户端
- [Command Line](cli.md)：启动选项和模式选择
- [JSON Event Stream](json.md)：JSON 事件参考
- [RPC Protocol](rpc.md)：RPC 生命周期、帧格式、错误和关闭
- [RPC Commands](rpc-commands.md)：命令和响应参考
- [RPC 扩展 UI](rpc-extension-ui.md)：扩展交互子协议
- [SDK 示例](../examples/sdk/)：in-process TypeScript 集成
