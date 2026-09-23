# SDK

`@earendil-works/pi-coding-agent` 将 Pi 嵌入到 Node.js 或 Bun 进程中。它提供对 command-line 应用所使用的代理、会话、工具、模型和资源的直接 TypeScript 访问。

使用 SDK 进行 in-process TypeScript 集成。对于 language-independent 或隔离的子进程，请参阅 [CLI Integration](cli-integration.md)。

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.prompt("What files are in the current directory?");
  console.log(session.getLastAssistantText());
} finally {
  session.dispose();
}
```

这会使用工作目录、已发现的资源、存储的设置和已配置的凭据。`prompt()` 在运行完成时解析。

[完整最小示例](../examples/sdk/01-minimal.ts) 也会流式传输文本事件。所有 [SDK 示例](../examples/sdk/) 都会随仓库进行类型检查。

<a id="session-management"></a>

## 会话生命周期｜会话 lifecycle

`createAgentSession()` 创建一个 `AgentSession`。该会话拥有一个对话、其模型和工具、排队消息、上下文压缩状态以及扩展运行时。

通过 `session.messages`、`session.model`、`session.thinkingLevel`、`session.systemPrompt` 和 `session.getActiveToolNames()` 读取当前状态。

`session.systemPrompt` 是 read-only，并返回当前生效的系统提示词，包括尚未发送给模型的更改。工具更改会在下一个请求之前向模型声明。

<a id="sessionmanager-api"></a>

### 会话存储｜会话 storage

会话默认是持久化的。`SessionManager` 拥有持久化或 in-memory 条目树，并跟踪其活动叶子节点。分支会更改该叶子节点，而不会删除被放弃的分支。当 Pi 重建模型上下文时，管理器会选择活动分支并应用上下文压缩。

`SessionManager` 是最终模型上下文的权威来源。通过使用包含这些条目的管理器构造会话来恢复外部历史记录。分配 `session.agent.state.messages` 不会替换持久化上下文。

当宿主不需要会话文件时，使用 in-memory 管理器：

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
```

有关创建、打开、继续、列出和分叉会话的示例，请参阅已检出的 [sessions 示例](../examples/sdk/11-sessions.ts)。[会话文件格式](session-format.md) 定义了持久化的 JSONL 契约，而 [消息类型](message-types.md) 定义了转录值。有关确切的方法和签名，请使用导出的 TypeScript 声明或 [`session-manager.ts`](../src/core/session-manager.ts)。

`cwd` 选择用于项目资源发现、上下文文件、会话分组和 built-in 工具路径的工作目录。当目标与 `process.cwd()` 不同时，请显式传入它。

`session.dispose()` 中止活动工作、使扩展上下文失效、断开与代理的连接，并移除事件监听器。当不再需要该会话时调用它。

`AgentSessionRuntime` 添加 `newSession()`、`switchSession()`、`fork()` 和 `importFromJsonl()`。每个操作都会替换活动的 `AgentSession`，并为目标工作目录重新创建服务。

在运行时替换后，订阅属于旧的 `AgentSession`，必须重新绑定。请参阅 [会话运行时示例](../examples/sdk/13-session-runtime.ts)。

## 提示｜ Prompting

`prompt()` 处理扩展命令，并在普通用户消息进入代理之前展开 file-based 提示词模板。对于被接受的代理运行，它会在运行完成后解析，包括自动重试。

在会话已经流式传输时发送的提示必须指定它应引导当前运行还是跟随当前运行。在没有该选择的情况下调用 `prompt()` 会拒绝，而不是进行猜测。

引导消息在当前助手回合及其工具调用之后进入。follow-up 在当前运行完成其待处理工作后进入。`steer()` 和 `followUp()` 直接暴露这些行为。

`abort()` 停止活动操作并等待会话变为空闲。`waitForIdle()` 等待而不中止它。

## 订阅事件｜ Subscribing to events

当宿主需要流式输出时，请在提示之前订阅：

```typescript
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await session.prompt("Explain this repository");
} finally {
  unsubscribe();
}
```

会话事件报告消息更新、工具执行、队列、上下文压缩、重试和运行生命周期变化。

`message_end` 包含权威的已完成消息。`agent_end` 标记一次 low-level 代理运行的结束，但自动恢复或排队的工作仍可能随后进行。

当宿主需要知道 Pi 不会自动继续时，使用 `agent_settled`。

## 配置会话｜ Configuring a 会话

在没有覆盖的情况下，工厂会创建一个 `ModelRuntime`、file-backed `SettingsManager`、持久化 `SessionManager`、`DefaultResourceLoader` 以及配置的默认工具。

每个边界都可以显式提供：

- `modelRuntime`、`model`、`thinkingLevel` 和 `scopedModels` 控制模型访问和选择。
- `settingsManager` 提供合并后的设置或 in-memory 配置。
- `sessionManager` 提供持久化或 in-memory 对话历史。
- `resourceLoader` 提供扩展、技能、提示词模板、主题和上下文文件。
- `tools`、`noTools`、`excludeTools` 和 `customTools` 控制活动工具集。

当你希望使用标准发现机制并带有选定的覆盖项时，请使用 `DefaultResourceLoader`。当宿主完全拥有资源存储和发现时，请提供自定义的 `ResourceLoader`。

<a id="inlineextension"></a>

内联扩展工厂可以通过 `DefaultResourceLoader` 提供。仅当需要在诊断和启动输出中拥有稳定名称时，才为其指定 `InlineExtension` 名称。

请参阅以下专项示例：[模型](../examples/sdk/02-custom-model.ts)、[工具](../examples/sdk/05-tools.ts)、[扩展](../examples/sdk/06-extensions.ts) 以及 [完全控制](../examples/sdk/12-full-control.ts)。

## 示例｜ Examples

| 示例｜ Example | 用途｜ Purpose |
|---|---|
| [最小示例](../examples/sdk/01-minimal.ts) | 创建、提示、观察并释放会话 |
| [自定义模型](../examples/sdk/02-custom-model.ts) | 选择模型和思考级别 |
| [系统提示词](../examples/sdk/03-custom-prompt.ts) | 替换或追加系统提示词 |
| [技能](../examples/sdk/04-skills.ts) | 发现、筛选并添加技能 |
| [工具](../examples/sdk/05-tools.ts) | 选择 built-in 工具及其工作目录 |
| [扩展](../examples/sdk/06-extensions.ts) | 加载 file-based 和内联扩展 |
| [上下文文件](../examples/sdk/07-context-files.ts) | 添加或替换项目指令 |
| [提示词模板](../examples/sdk/08-prompt-templates.ts) | 添加 file-style 提示词模板 |
| [凭据](../examples/sdk/09-api-keys-and-oauth.ts) | 配置凭据和模型存储 |
| [设置](../examples/sdk/10-settings.ts) | 提供 file-backed 或 in-memory 设置 |
| [会话](../examples/sdk/11-sessions.ts) | 控制会话持久化和恢复 |
| [完全控制](../examples/sdk/12-full-control.ts) | 替换默认的发现和状态服务 |
| [会话运行时](../examples/sdk/13-session-runtime.ts) | 安全地替换活动会话 |

<a id="exports"></a>

## 资源｜ Resources

- [选择模型](models.md) 涵盖模型选择和兼容端点；[模型提供商认证](providers.md) 涵盖凭据和 cloud-provider 设置。
- [配置](configuration.md) 说明了常规发现和设置；[设置](settings.md) 列出了每一项设置。
- [会话和上下文](sessions.md) 说明了会话行为；[会话格式](session-format.md) 定义了持久化条目；[消息类型](message-types.md) 定义了共享的转录值。
- [扩展](extensions.md)、[技能](skills.md) 和 [提示词模板](prompt-templates.md) 记录了通过 `ResourceLoader` 提供的资源。
- [CLI 集成](cli-integration.md) 涵盖了 print、JSON 和 RPC 作为 in-process SDK 集成的替代方案。
