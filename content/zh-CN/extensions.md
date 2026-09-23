# 扩展｜ Extensions

扩展是 TypeScript 模块，为 Pi 添加可执行行为。当工作流需要工具、命令、事件处理器、模型提供商、会话状态或终端 UI ，而不仅仅是指令时，请使用扩展。

扩展在 Pi 进程内运行，具有相同的 operating-system 权限。它可以检查提示词、工具调用、文件、凭据和会话历史，因此请仅从你信任的来源加载扩展。

典型的扩展会添加代理工具、保护路径、确认危险命令、响应会话事件、修改上下文、公开命令或显示持久状态。

<a id="quick-start"></a>
<a id="writing-an-extension"></a>
<a id="create-an-extension"></a>

## 创建并加载扩展｜ Create and load an 扩展

扩展导出一个默认工厂函数，该函数接收 `ExtensionAPI`。工厂为当前扩展运行时注册各项能力。

创建 `~/.pi/agent/extensions/hello.ts`：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Show a greeting",
    handler: async (name, ctx) => {
      ctx.ui.notify(`Hello, ${name || "world"}!`, "info");
    },
  });
}
```

启动 Pi 并运行 `/hello`。在开发期间，直接加载文件：

```bash
pi --extension ./hello.ts
```

Pi 使用 `jiti`，因此本地 TypeScript 扩展不需要单独的编译步骤。对于分发的扩展和依赖项，请使用 [Pi packages](packages.md)。

<a id="extension-locations"></a>
<a id="available-imports"></a>
<a id="choose-where-it-loads"></a>

## 将其添加到 Pi｜ Add it to Pi

将扩展放在你的用户或项目扩展目录中。Pi 会加载直接的 TypeScript 或 JavaScript 文件，以及包含 `index.ts` 或 `index.js` 入口点的子目录。

小型扩展使用单个文件，multi-file 实现使用目录。将 npm dependencies 放在附近的 `package.json` 中。有关常规位置，请参阅 [配置](configuration.md)；有关其他路径，请参阅 [Settings](settings.md#resources)。

Reload 会替换扩展运行时，因此 `await ctx.reload()` 之后的代码不得复用旧运行时的状态。只有个人扩展和显式 command-line 扩展才能参与在项目扩展加载之前运行的 `project_trust` 事件。

<a id="understand-the-lifecycle"></a>

## 遵循运行时生命周期｜ Respect the runtime lifecycle

工厂函数可以是同步的或异步的。Pi 会等待异步工厂完成后再继续启动，从而允许它获取启动期间所需的配置或注册模型提供商。

不要在工厂函数中启动进程、套接字、监视器或定时器，因为某些调用会在不启动会话的情况下加载扩展。
从 `session_start` 或从需要它们的命令或工具启动 long-lived 资源。
从幂等的 `session_shutdown` 处理程序关闭 session-scoped 资源。

一次运行从输入和 `before_agent_start` 开始，经过模型、消息和工具事件，直到 `agent_end`。
自动重试、恢复、上下文压缩或排队的工作之后仍可继续。
<a id="agent_start--agent_end--agent_before_settle--agent_settled"></a>

`agent_before_settle` 是最终的可操作边界：它可以追加条目并请求一次继续。
`agent_settled` 是最终的且 notification-only；当集成需要知道 Pi 不会自动继续时，请使用它。

<a id="extensionapi-methods"></a>

## 选择集成点｜ Choose an integration point

| 能力 | 主要 API |
|---|---|
| 观察或修改生命周期行为 | `pi.on()` |
| 添加 model-callable 操作 | `pi.registerTool()` |
| 添加 `/` 命令 | `pi.registerCommand()` |
| 添加快捷键或 CLI 标志 | `pi.registerShortcut()` 或 `pi.registerFlag()` |
| 发送用户消息或自定义消息 | `pi.sendUserMessage()` 或 `pi.sendMessage()` |
| 持久化 non-context 会话数据 | `pi.appendEntry()` |
| 更改活动工具、模型或思考级别 | `pi` 上的会话控制方法 |
| 添加模型提供商 | `pi.registerProvider()` |
| 添加终端渲染 | 渲染器注册与 `ctx.ui` |
| 与另一个扩展通信 | `pi.events` |

使用 [`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) 中导出的声明来获取确切的事件、上下文、工具和结果类型。

## 遵循扩展契约｜ Follow the 扩展 contracts

<a id="events"></a>
<a id="work-with-events"></a>

### 事件与并发｜ Events and concurrency

处理程序按扩展加载和注册顺序运行。`pi.on()` 返回一个函数，用于取消该注册；更改不会影响已在进行中的分发。
有些事件用于通知；其他事件则转换数据、替换结果或取消操作。
请使用每个事件声明的结果类型，而不要假设每个返回值都会产生效果。

事件涵盖资源发现、会话、代理与消息生命周期、模型提供商、工具以及原始输入。

`before_agent_start` 同时暴露当前提示词及其结构化 `systemPromptOptions`。优先更改提示词部分、所选工具或准则，以便 Pi 可以追加转录增量。返回 `systemPrompt`，或设置 `forceSystemPrompt`，会替换该次运行的整个提示词，同时转录继续记录结构化部分。模型提供商将强制文本作为其开头的系统提示词接收。

`message_end` 可以替换已最终确定的消息，同时保留其角色。`tool_call` 可以修改输入或阻止执行。`tool_result` 处理程序会组合，每个处理程序都能看到先前的更改。

<a id="context_with_system"></a>

`context` 转换对话消息，但不包括提示词和工具系统消息；Pi 之后会恢复该状态。仅当 request-local 转换必须拥有完整转录时，才使用 `context_with_system`，并将系统消息保留在索引零处。

`turn_end` 和 `agent_before_settle` 是可操作的边界。它们的处理程序可以串联提议的 `custom`、`custom_message`、`context_edit` 或 `compaction` 条目，并为下一次模型请求返回 `continue: true`。请保护继续条件，因为无条件继续可能会循环。使用导出的事件声明来获取完整的验证和排序契约。

<a id="cache_warming_decision"></a>

`cache_warming_decision` 可以使用 `{ action: "warm" }` 或 `{ action: "stop" }` 覆盖空闲的 prompt-cache 刷新。最后一个返回操作的处理程序胜出。

来自同一条助手消息的工具调用可以并行运行。
当另一个工具事件运行时，不要假设存在同级调用或结果。
对于由活动轮次拥有的嵌套工作，请使用 `ctx.signal`；命令和空闲会话事件通常没有操作信号。

返回 `undefined` 的 `user_bash` 处理程序会将命令传递给下一个处理程序，如果没有处理程序处理它，则传递给本地执行。返回 `operations` 或 `result` 会停止传播。处理程序失败会阻止该命令，而不会落到本地执行。

<a id="custom-tools"></a>
<a id="register-tools"></a>

### 工具｜ Tools

自定义工具定义名称、model-facing 描述、TypeBox 参数 schema 以及 `execute()` 函数。
其结果需要 model-facing `content` 以及用于渲染或状态重建的 `details` 字段。
当没有结构化详情时使用 `details: undefined`。如果该工具发起嵌套模型调用，请在结果中包含它们的 `usage`，以便会话总计保持准确。

从 `execute()` 抛出以产生失败的工具结果。
返回对象不会将其标记为错误。
仅当该批次中每个已完成的工具都同意终止后，代理应跳过其自动 follow-up 时，才返回 `terminate: true`。

当工具共享可变 in-memory 状态时，使用顺序执行。
修改文件的工具应使用 `withFileMutationQueue()` 包裹完整的 read-modify-write 操作。
截断较大的 model-facing 结果，并告知模型在哪里读取完整输出。

参见 [`hello.ts`](../examples/extensions/hello.ts)、[`todo.ts`](../examples/extensions/todo.ts)、[`dynamic-tools.ts`](../examples/extensions/dynamic-tools.ts) 以及 [`truncated-tool.ts`](../examples/extensions/truncated-tool.ts)。

### 动态激活工具｜ Activate tools dynamically

先注册每个工具，保持可选工具处于非活动状态，并使用加载器工具中的 `pi.setActiveTools()` 来选择所需的活动工具。名称必须已注册；未知名称将被忽略。

Pi 在转录的第一条系统消息中记录初始提示词和工具集，然后在下一个模型请求之前追加工具和提示词变更。无法表示该转换的模型提供商会收到完整的转录检查点，这可能会使缓存的前缀失效。

<a id="extensioncontext"></a>
<a id="extensioncommandcontext"></a>
<a id="use-extension-context"></a>

### 上下文和会话变更｜ Context and 会话 changes

`ExtensionContext` 提供工作目录、模式、UI、会话管理器、模型运行时、中止信号、上下文用量以及用于上下文压缩和关闭的控制。
使用 `ctx.modelRegistry.streamSimple()` 进行 provider-neutral 嵌套模型调用。

命令处理程序接收 `ExtensionCommandContext`，它添加了等待空闲、重新加载、树导航和会话替换的操作。
这些操作是 command-only，因为从生命周期处理程序调用它们可能会导致运行时死锁。

会话替换会使旧上下文失效。在切换之前仅捕获纯数据，然后使用提供给 `withSession` 的新上下文进行 session-bound 工作。

<a id="state-management"></a>
<a id="persist-state"></a>

### 状态｜ State

根据状态如何参与对话来选择存储：

| 状态｜ State | 存储｜ Storage |
|---|---|
| 跟随活动分支的工具状态 | 工具结果 `details` |
| 从模型上下文中排除的持久数据 | `pi.appendEntry()` |
| 存储并发送给模型的自定义内容 | `pi.sendMessage()` |
| 单个会话之外的数据 | 外部存储 |

在 `session_start` 期间从 `ctx.sessionManager.getBranch()` 重建 branch-sensitive 状态。
不要从每个文件条目重建它，因为被放弃的分支代表替代历史。
当自定义存储内容应出现在记录中时，注册一个条目或消息渲染器。

<a id="custom-ui"></a>
<a id="mode-behavior"></a>
<a id="interact-with-the-user"></a>
<a id="account-for-each-mode"></a>

### UI 与模式

`ctx.ui` 提供对话框、通知、状态文本、小组件、标题、编辑器访问和自定义组件。
仅当交互需要自己的渲染和输入时才使用 `ctx.ui.custom()`。
有关组件、焦点、覆盖层、主题和性能指南，请参阅 [终端 UI](tui.md)。

扩展在交互模式、RPC、JSON 和打印模式下加载。
交互模式提供完整的终端 UI。
RPC 可以通过 [RPC 扩展 UI protocol](rpc-extension-ui.md) 转发受支持的对话框和通知，但不支持自定义终端组件；JSON 和打印模式没有 UI。
使用 `ctx.mode === "tui"` 保护 terminal-only 行为，并对交互式和 RPC 客户端支持的交互使用 `ctx.hasUI`。

保持工具和事件行为独立于渲染，以便 non-interactive 模式保持可用。

<a id="error-handling"></a>
<a id="handle-errors-and-shutdown"></a>

### 错误与清理

Pi 报告处理程序错误并尽可能继续。`tool_call` 处理程序失败会作为 fail-safe 阻止该工具；工具执行失败会成为模型的错误结果。

在 `session_shutdown` 中释放资源，即使正常操作已尝试清理。
保持清理幂等，因为取消、重新加载、会话替换和进程退出可能汇聚到同一路径。
使用 `ctx.shutdown()` 请求有序关闭进程。

<a id="examples-reference"></a>
<a id="use-examples-as-the-implementation-reference"></a>

## 示例与参考

已检查的 [扩展示例](../examples/extensions/) 涵盖工具、生命周期事件、命令、标志、快捷键、状态、渲染、模型提供商、OAuth、远程执行和终端组件。
从与你的集成点匹配的最小示例开始。

使用 [Custom Providers](custom-provider.md) 进行 model-service 集成，使用 [终端 UI](tui.md) 进行自定义组件，并使用 [Pi Packages](packages.md) 将扩展与其他资源一起安装或分发。
