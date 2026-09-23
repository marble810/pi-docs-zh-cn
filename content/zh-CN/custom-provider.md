# 自定义模型提供商｜ Custom Providers

提供商扩展将 Pi 连接到需要自定义身份验证、模型发现、请求处理或流式传输的模型服务。如果该服务已经使用受支持的 API，请改为在 `models.json` 中配置它。

提供商扩展在 Pi 内部运行，可以检查凭据、提示词、工具定义、模型响应和用量。请将它们视为受信任的代码，并避免记录密钥或提供商负载。

## 选择最小的集成方式｜ Choose the smallest integration

| 需求 | 使用 |
|---|---|
| 在受支持的 API 后面添加模型 | [`models.json`](models.md#configure-a-compatible-endpoint) |
| 更改现有提供商的端点或请求头 | `models.json` 或一个小型提供商扩展 |
| 动态发现模型 | 带有 `refreshModels` 的提供商 |
| 添加 `/login` 流程 | 带有原生或旧版 OAuth 配置的提供商 |
| 实现不受支持的传输协议 | 带有 `stream` 或 `streamSimple` 的提供商 |

提供商扩展是一个 [扩展](extensions.md)，因此它遵循相同的加载、信任、重新加载和错误行为。

## 注册提供商｜ Register a 模型提供商

从扩展工厂调用 `pi.registerProvider()`。Pi 会等待异步工厂完成后再继续启动，因此在那里注册的提供商可用于启动时的模型选择和 `pi --list-models`。

有两种注册形式：

- 从 `@earendil-works/pi-ai` 注册一个完整的 `Provider`，以实现原生身份验证、过滤、发现、刷新和流式传输行为。
- 使用 `ProviderConfig` 注册提供商名称，以采用现有扩展使用的旧版配置形式。

对于不仅仅拥有静态端点和模型元数据的新集成，优先使用完整的提供商。Pi 会在已注册的原生提供商之上组合 `models.json` 覆盖。

仅为现有提供商注册 `baseUrl` 或 `headers` 会保留其 built-in 模型。在旧版形式中提供 `models` 会替换该注册所提供的模型。

在初始扩展加载后进行的调用会立即生效。使用 `pi.unregisterProvider()` 移除动态模型提供商，并恢复它所替代的 built-in 行为。

请参阅已检出的 [GitLab Duo 模型提供商](../examples/extensions/custom-provider-gitlab-duo/)，了解将流式传输委托给 built-in API 实现的完整注册。

## 提供身份验证｜ Provide authentication

静态模型提供商可以从字面量、环境变量插值或命令中解析 API 密钥。这些值使用与 `models.json` 相同的语法：

- `$NAME` 和 `${NAME}` 读取环境变量。
- 开头的 `!command` 使用命令输出。
- `$` 输出字面量 ``$` 输出字面量 。
- `$!` 输出字面量开头的 `!`。

当集成需要存储的凭据、自定义解析、provider-scoped 环境或多个登录方式时，请使用原生模型提供商身份验证。

OAuth 模型提供商提供显示名称、登录流程、令牌刷新和 access-token 解析。注册后它会出现在 `/login` 中，并且 Pi 会将返回的凭据存储在 `~/.pi/agent/auth.json` 中。

OAuth 回调与 UI 无关。它们可以打开授权 URL、显示设备代码、报告进度、请求输入，或要求用户选择登录方式。在网络请求期间，请遵循取消操作和提供的中止信号。

切勿将访问令牌、刷新令牌、授权标头或完整的模型提供商响应写入普通日志。

## 提供并刷新模型｜ Supply and refresh models

每个模型都需要 ID、显示名称、输入能力、上下文窗口、输出限制、推理支持和成本元数据。除非某个模型需要覆盖，否则请在模型提供商级别选择 API 实现。

当 Pi 应保持空闲提示词缓存处于热状态时，将 `promptCache.short` 或 `promptCache.long` 设置为模型提供商的 best-effort 缓存生命周期（以秒为单位）。保持未设置状态，以禁用该保留层级的缓存预热。

兼容性标志描述在原本受支持的 API 中已验证的差异。不要仅因为某个端点声称兼容就启用它们。

请根据实际服务器确认请求字段和响应行为。

当可用目录来自实时服务时，请使用 `refreshModels`。将 `context.signal` 传递给阻塞式 I/O ，以便调用方可以取消刷新。

这两种注册形式具有不同的刷新契约：

- 完整的 `Provider` 不返回任何内容。它调用 `context.publish({ update })` 来安装 provider-owned 模型状态，之后其同步的 `getModels()` 会公开最新列表。
- 旧版 `ProviderConfig.refreshModels` 返回模型定义。Pi 会用返回的列表替换该注册的实时模型，并应用任何请求的持久化。

仅当持久化目录数据应跨运行保留时才发布它。诸如 llama.cpp 之类的实时服务可以更新其 in-memory 列表而不持久化它；远程目录可以保留快照以便离线启动。

## 复用受支持的流式 API｜ Reuse a supported streaming API

只要模型提供商协议匹配，就使用 Pi AI 的 API 实现之一。

支持的实现涵盖 Anthropic Messages、OpenAI Chat Completions 和 Responses、Google Generative AI 和 Vertex、Azure OpenAI Responses、Mistral Conversations 以及 Bedrock Converse。

模型提供商仍可自定义身份验证、基础 URL、请求头、模型过滤和发现，同时将请求转换和流式传输委托给现有的 API 实现。

这比复制流式实现更安全，因为它保留了 Pi 的消息转换、工具处理、用量统计、取消和兼容性行为。

## 实现自定义流式传输｜ Implement custom streaming

仅当没有现有的 API 实现能够表示该服务时，才实现 `streamSimple`。请先研究 [`packages/ai/src/api`](https://github.com/earendil-works/pi/tree/main/packages/ai/src/api) 下的实现。

该流接收规范化的 `TranscriptContext`。系统提示词和工具声明位于转录系统消息中，因此请使用 `getCurrentSystemPrompt(context.messages)` 和 `getCurrentTools(context.messages)` 读取它们，而不要期望 `context.systemPrompt` 或 `context.tools`。支持 mid-conversation 系统消息的模型可以就地接收它们；否则调用 `collapseSystemMessages(context)` 将后续系统消息合并到开头的系统消息中。

自定义流必须：

1. 创建一条助手消息，包含模型提供商、模型、时间戳、待定停止原因、内容以及归零的用量。
2. 请求设置成功后，在内容事件之前发出一个 `start` 事件。
3. 在发出平衡的文本、思考和 tool-call 事件的同时更新消息。
4. 最终确定用量、成本、内容和停止原因。
5. 恰好发出一个终止性的 `done` 或 `error` 事件并关闭流。
6. 将取消转换为已中止的结果。

请求设置可能在 `start` 之前失败；在这种情况下，流可以直接以 `error` 终止。缺少请求身份验证也可能在返回流之前同步抛出异常。

内容索引指的是助手消息中的块。在发出其 `partial` 字段暴露该状态的事件之前，更新每个块。工具调用参数必须在 `toolcall_end` 之前包含有效的已解析输入。

该流还必须遵循通过 `SimpleStreamOptions` 提供的请求插桩：

- 在发送模型提供商请求之前调用 `options.onPayload`，并使用其返回的任何替换负载。
- 在收到响应之后、消费其正文之前调用 `options.onResponse`。
- 透传中止信号和 provider-scoped 环境。

这些钩子为扩展请求检查和 response-header 事件提供支持。省略它们会使模型提供商的行为与 Pi 的 built-in 模型提供商不同。

## 报告失败和用量｜ Report failures and usage

设置具体的终止性停止原因。错误和已中止的消息需要 `errorMessage`；成功的消息需要准确的输入、输出、缓存、total-token 和成本值。

Pi 可以在识别到 context-overflow 错误后进行上下文压缩并重试。如果该服务使用未知消息，请仅在受保护的 `message_end` 处理程序中将该模型提供商的溢出响应规范化为 `context_length_exceeded`。

不要将速率限制或临时性模型提供商故障改写为上下文溢出。这些故障改用 Pi 的正常重试行为。

## 测试集成｜ Test the integration

至少测试：

- 普通和空文本响应
- 工具调用和工具结果
- 在支持时测试图像输入和图像工具结果
- 用量和成本核算
- 中止行为
- 上下文溢出
- 格式错误或不完整的流
- Unicode 边界
- cross-provider 会话交接
- 身份验证刷新和取消

[`packages/ai/test`](https://github.com/earendil-works/pi/tree/main/packages/ai/test) 下的模型提供商测试定义了 built-in 模型提供商所期望的行为。应调整相关测试套件，而不是仅依赖手动提示词。

在开发期间直接运行扩展，然后将其移动到已发现的扩展位置，或通过 [Pi 包](packages.md) 分发。在活动会话中更改已发现的模型提供商扩展后，使用 `/reload`。
