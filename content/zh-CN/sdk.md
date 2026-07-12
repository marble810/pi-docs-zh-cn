> pi 可以帮助你使用 SDK。让它为你的用例构建一个集成。

# SDK

SDK 提供了对 pi 代理能力的编程式访问。用它来将 pi 嵌入其他应用程序、构建自定义界面或与自动化工作流集成。

**示例用例：**

- 构建自定义 UI (Web、桌面、移动端)
- 将代理能力集成到现有应用程序中
- 创建具有代理推理能力的自动化流水线
- 构建可生成 sub-agents 的自定义工具
- 以编程方式测试代理行为

从最小示例到完全控制的工作示例请参见 [examples/sdk/](../examples/sdk/)。

## 快速入门

```typescript
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager
} from "@earendil-works/pi-coding-agent";

// Set up credential storage and model registry
const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("What files are in the current directory?");
```

## 安装

```bash
npm install @earendil-works/pi-coding-agent
```

SDK 已包含在主包中。无需单独安装。

## 核心概念

### createAgentSession()

用于单个 `AgentSession` 的主要工厂函数。

`createAgentSession()` 使用 `ResourceLoader` 来提供扩展、技能、提示词模板、主题和上下文文件。如果你不提供，它将使用 `DefaultResourceLoader` 进行标准发现。

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// Minimal: defaults with DefaultResourceLoader
const { session } = await createAgentSession();

// Custom: override specific options
const { session } = await createAgentSession({
  model: myModel,
  tools: ["read", "bash"],
  sessionManager: SessionManager.inMemory()
});
```

### AgentSession

会话管理代理的生命周期、消息历史、模型状态、上下文压缩和事件流。

```typescript
interface AgentSession {
  // Send a prompt and wait for completion
  prompt(text: string, options?: PromptOptions): Promise<void>;

  // Queue messages during streaming
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;

  // Subscribe to events (returns unsubscribe function)
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;

  // Session info
  sessionFile: string | undefined;
  sessionId: string;

  // Model control
  setModel(model: Model): Promise<void>;
  setThinkingLevel(level: ThinkingLevel): void;
  cycleModel(): Promise<ModelCycleResult | undefined>;
  cycleThinkingLevel(): ThinkingLevel | undefined;

  // State access
  agent: Agent;
  model: Model | undefined;
  thinkingLevel: ThinkingLevel;
  messages: AgentMessage[];
  isStreaming: boolean;

  // In-place tree navigation within the current session file
  navigateTree(
    targetId: string,
    options?: {
      summarize?: boolean;
      customInstructions?: string;
      replaceInstructions?: boolean;
      label?: string;
    }
  ): Promise<{ editorText?: string; cancelled: boolean }>;

  // Compaction
  compact(customInstructions?: string): Promise<CompactionResult>;
  abortCompaction(): void;

  // Abort current operation
  abort(): Promise<void>;

  // Cleanup
  dispose(): void;
}
```

会话替换 API ，如 new-session、恢复、派生和导入，位于 `AgentSessionRuntime` 上，而非 `AgentSession` 上。

### createAgentSessionRuntime() 和 AgentSessionRuntime

当你需要替换活动会话并重建 cwd-bound 运行时状态时，请使用运行时 API。
这与 built-in 的交互、打印和 RPC 模式所使用的层相同。

`createAgentSessionRuntime()` 接受一个运行时工厂函数以及初始的 cwd/会话 目标。该工厂函数闭包捕获 process-global 固定输入，为有效 cwd 重新创建 cwd-bound 服务，根据这些服务解析会话选项，并返回完整的运行时结果。

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager
} from "@earendil-works/pi-coding-agent";

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent
    })),
    services,
    diagnostics: services.diagnostics
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});
```

`AgentSessionRuntime` 负责在以下场景中替换活动运行时：

- `newSession()`
- `switchSession()`
- `fork()`
- 通过 `fork(entryId, { position: "at" })` 克隆流程
- `importFromJsonl()`

重要行为：

- `runtime.session` 在这些操作之后会发生变化
- 事件订阅会附加到特定的 `AgentSession`，因此在替换后需要 re-subscribe
- 如果你使用了扩展，需要为新会话再次调用 `runtime.session.bindExtensions(...)`
- 创建过程会在 `runtime.diagnostics` 上返回诊断信息
- 如果运行时创建或替换失败，该方法会抛出异常，由调用方决定如何处理

```typescript
let session = runtime.session;
let unsubscribe = session.subscribe(() => {});

await runtime.newSession();

unsubscribe();
session = runtime.session;
unsubscribe = session.subscribe(() => {});
```

### 提示词与消息队列

`PromptOptions` 控制提示词展开、流式传输期间的排队行为以及提示词预检通知：

```typescript
interface PromptOptions {
  expandPromptTemplates?: boolean;
  images?: ImageContent[];
  streamingBehavior?: "steer" | "followUp";
  source?: InputSource;
  preflightResult?: (success: boolean) => void;
}
```

每次调用 `prompt()` 时，`preflightResult` 会被调用一次：

- `true` 在提示词被接受、排队或立即处理时触发
- `false` 在提示词预检在接纳前被拒绝时触发

它在 `prompt()` 解析之前触发。`prompt()` 仍然仅在完整的接纳运行结束后才解析，包括重试。接纳后的失败会通过正常的事件和消息流报告，而不是通过 `preflightResult(false)`。

`prompt()` 方法处理提示词模板、扩展命令和消息发送：

```typescript
// Basic prompt (when not streaming)
await session.prompt("What files are here?");

// With images
await session.prompt("What's in this image?", {
  images: [{ type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } }]
});

// During streaming: must specify how to queue the message
await session.prompt("Stop and do this instead", { streamingBehavior: "steer" });
await session.prompt("After you're done, also check X", { streamingBehavior: "followUp" });
```

**行为：**

- **扩展命令** (e.g., `/mycommand`)：立即执行，即使在流式传输期间也是如此。它们通过 `pi.sendMessage()` 管理自己的 LLM 交互。
- **基于文件的提示词模板** (来自 `.md` 文件)：在发送或排队前展开为其内容。
- **在没有 `streamingBehavior` 的情况下进行流式传输时**：抛出错误。请直接使用 `steer()` 或 `followUp()`，或指定该选项。
- **`preflightResult(true)`**：表示提示词已被接受、排队或立即处理。
- **`preflightResult(false)`**：表示在接受前预检已拒绝。

在流式传输期间显式排队：

```typescript
// Queue a steering message for delivery after the current assistant turn finishes its tool calls
await session.steer("New instruction");

// Wait for agent to finish (delivered only when agent stops)
await session.followUp("After you're done, also do this");
```

`steer()` 和 `followUp()` 都会展开 file-based 提示词模板，但在扩展命令上会报错 (扩展命令无法排队)。

### 代理与 AgentState

来自 `@earendil-works/pi-agent-core` 的 `Agent` 类 () 处理核心 LLM 交互。可通过 `session.agent` 访问它。

```typescript
// Access current state
const state = session.agent.state;

// state.messages: AgentMessage[] - conversation history
// state.model: Model - current model
// state.thinkingLevel: ThinkingLevel - current thinking level
// state.systemPrompt: string - system prompt
// state.tools: AgentTool[] - available tools
// state.streamingMessage?: AgentMessage - current partial assistant message
// state.errorMessage?: string - latest assistant error

// Replace messages (useful for branching or restoration)
session.agent.state.messages = messages; // copies the top-level array

// Replace tools
session.agent.state.tools = tools; // copies the top-level array

// Wait for agent to finish processing
await session.agent.waitForIdle();
```

### 事件

订阅事件以接收流式输出和生命周期通知。

```typescript
session.subscribe((event) => {
  switch (event.type) {
    // Streaming text from assistant
    case "message_update":
      if (event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
      if (event.assistantMessageEvent.type === "thinking_delta") {
        // Thinking output (if thinking enabled)
      }
      break;

    // Tool execution
    case "tool_execution_start":
      console.log(`Tool: ${event.toolName}`);
      break;
    case "tool_execution_update":
      // Streaming tool output
      break;
    case "tool_execution_end":
      console.log(`Result: ${event.isError ? "error" : "success"}`);
      break;

    // Message lifecycle
    case "message_start":
      // New message starting
      break;
    case "message_end":
      // Message complete
      break;

    // Agent lifecycle
    case "agent_start":
      // Agent started processing prompt
      break;
    case "agent_end":
      // Agent finished (event.messages contains new messages)
      break;

    // Turn lifecycle (one LLM response + tool calls)
    case "turn_start":
      break;
    case "turn_end":
      // event.message: assistant response
      // event.toolResults: tool results from this turn
      break;

    // Session events (queue, compaction, retry)
    case "queue_update":
      console.log(event.steering, event.followUp);
      break;
    case "compaction_start":
    case "compaction_end":
    case "auto_retry_start":
    case "auto_retry_end":
      break;
  }
});
```

## 选项参考

### 目录

```typescript
const { session } = await createAgentSession({
  // Working directory for DefaultResourceLoader discovery
  cwd: process.cwd(), // default

  // Global config directory
  agentDir: "~/.pi/agent" // default (expands ~)
});
```

`cwd` 被 `DefaultResourceLoader` 用于：

- 项目扩展 (`.pi/extensions/`)
- 项目技能：
  - `.pi/skills/`
  - `.agents/skills/` 位于 `cwd` 及祖先目录中 (向上至 git repo 根目录，或不在仓库中时向上至文件系统根目录)
- 项目提示词 (`.pi/prompts/`)
- 上下文文件 (`AGENTS.md` 从当前工作目录向上查找)
- 会话目录命名

`agentDir` 被 `DefaultResourceLoader` 用于：

- 全局扩展 (`extensions/`)
- 全局技能：
  - `skills/` 位于 `agentDir` 下 (例如 `~/.pi/agent/skills/`)
  - `~/.agents/skills/`
- 全局提示词 (`prompts/`)
- 全局上下文文件 (`AGENTS.md`)
- 设置 (`settings.json`)
- 自定义模型 (`models.json`)
- 凭据 (`auth.json`)
- 会话 (`sessions/`)

当你传入自定义 `ResourceLoader` 时，`cwd` 和 `agentDir` 不再控制资源发现。它们仍会影响会话命名和工具路径解析。

### 模型

```typescript
import { getModel } from "@earendil-works/pi-ai";
import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

// Find specific built-in model (doesn't check if API key exists)
const opus = getModel("anthropic", "claude-opus-4-5");
if (!opus) throw new Error("Model not found");

// Find any model by provider/id, including custom models from models.json
// (doesn't check if API key exists)
const customModel = modelRegistry.find("my-provider", "my-model");

// Get only models that have valid API keys configured
const available = await modelRegistry.getAvailable();

const { session } = await createAgentSession({
  model: opus,
  thinkingLevel: "medium", // off, minimal, low, medium, high, xhigh, max

  // Models for cycling (Ctrl+P in interactive mode)
  scopedModels: [
    { model: opus, thinkingLevel: "high" },
    { model: haiku, thinkingLevel: "off" }
  ],

  authStorage,
  modelRegistry
});
```

如果未提供模型：

1. 尝试从会话恢复 (如果继续)
2. 使用设置中的默认值
3. 回退到第一个可用模型

要匹配 CLI 的模型解析，请使用导出的解析器辅助函数：

```typescript
import { resolveCliModel, resolveModelScopeWithDiagnostics } from "@earendil-works/pi-coding-agent";

const cliModel = resolveCliModel({
  cliModel: "anthropic/claude-opus-4-5:high",
  modelRegistry
});
if (cliModel.error) throw new Error(cliModel.error);
if (cliModel.warning) console.warn(cliModel.warning);

const { scopedModels, diagnostics } = await resolveModelScopeWithDiagnostics(
  ["anthropic/*:high", "gpt-5"],
  modelRegistry
);
for (const diagnostic of diagnostics) {
  console.warn(diagnostic.message);
}
```

`resolveCliModel()` 使用所有已注册的模型，因此 `--api-key` 风格的 first-time 设置可以在存储的认证信息存在之前解析模型。`resolveModelScopeWithDiagnostics()` 匹配 `--models` 和 `enabledModels` 的语义，同时返回警告而不是打印它们。

> 参见 [examples/sdk/02-custom-model.ts](../examples/sdk/02-custom-model.ts)

### API 密钥与 OAuth

API 密钥解析优先级 (由 AuthStorage 处理)：

1. 运行时覆盖 (通过 `setRuntimeApiKey`，不持久化)
2. 存储在 `auth.json` 中的凭据 (API 密钥或 OAuth 令牌)
3. 环境变量 (`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 等)
4. 回退解析器 (用于来自 `models.json` 的自定义模型提供商密钥)

```typescript
import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";

// Default: uses ~/.pi/agent/auth.json and ~/.pi/agent/models.json
const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry
});

// Runtime API key override (not persisted to disk)
authStorage.setRuntimeApiKey("anthropic", "sk-my-temp-key");

// Custom auth storage location
const customAuth = AuthStorage.create("/my/app/auth.json");
const customRegistry = ModelRegistry.create(customAuth, "/my/app/models.json");

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage: customAuth,
  modelRegistry: customRegistry
});

// No custom models.json (built-in models only)
const simpleRegistry = ModelRegistry.inMemory(authStorage);
```

> 参见 [examples/sdk/09-api-keys-and-oauth.ts](../examples/sdk/09-api-keys-and-oauth.ts)

### 系统提示词

使用 `ResourceLoader` 来覆盖系统提示词：

```typescript
import { createAgentSession, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  systemPromptOverride: () => "You are a helpful assistant."
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/03-custom-prompt.ts](../examples/sdk/03-custom-prompt.ts)

### 工具

指定要启用的 built-in 工具：

- 内置工具名称：`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`
- 默认 built-ins：`read`、`bash`、`edit`、`write`
- `noTools: "all"` 禁用所有工具
- `noTools: "builtin"` 禁用默认的 built-ins，同时保持扩展和自定义工具启用
- `excludeTools` 在应用任何 `tools` 允许列表后，禁用特定的 built-in、扩展或自定义工具名称

`edit` 工具为 Pi 的 TUI 显示返回 `details.diff`，并为 SDK 消费者返回 `details.patch` 作为标准统一补丁。

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

// Read-only mode
const { session } = await createAgentSession({
  tools: ["read", "grep", "find", "ls"]
});

// Pick specific tools
const { session } = await createAgentSession({
  tools: ["read", "bash", "grep"]
});

// Disable one tool while keeping the rest available
const { session } = await createAgentSession({
  excludeTools: ["ask_question"]
});
```

#### 使用自定义 cwd 的工具

当你传入自定义 `cwd` 时，`createAgentSession()` 会为该 cwd 构建选定的 built-in 工具。

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const cwd = "/path/to/project";

// Use default tools for custom cwd
const { session } = await createAgentSession({
  cwd,
  sessionManager: SessionManager.inMemory(cwd)
});

// Or pick specific tools for custom cwd
const { session } = await createAgentSession({
  cwd,
  tools: ["read", "bash", "grep"],
  sessionManager: SessionManager.inMemory(cwd)
});
```

> 参见 [examples/sdk/05-tools.ts](../examples/sdk/05-tools.ts)

### 自定义工具

```typescript
import { Type } from "typebox";
import { createAgentSession, defineTool } from "@earendil-works/pi-coding-agent";

// Inline custom tool
const myTool = defineTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something useful",
  parameters: Type.Object({
    input: Type.String({ description: "Input value" })
  }),
  execute: async (_toolCallId, params) => ({
    content: [{ type: "text", text: `Result: ${params.input}` }],
    details: {}
  })
});

// Pass custom tools directly
const { session } = await createAgentSession({
  customTools: [myTool]
});
```

对于独立定义和像`customTools: [myTool]`这样的数组，使用`defineTool()`。内联的`pi.registerTool({ ... })`已经能正确推断参数类型。

通过 `customTools` 传入的自定义工具会与 extension-registered 工具合并。由 ResourceLoader 加载的扩展也可以通过 `pi.registerTool()` 注册工具。

如果你传入 `tools`，请包含你想要启用的每个自定义或扩展工具名称，例如 `tools: ["read", "bash", "my_tool"]`。

> 参见 [examples/sdk/05-tools.ts](../examples/sdk/05-tools.ts)

### 扩展

扩展由`ResourceLoader`加载。`DefaultResourceLoader`从`~/.pi/agent/extensions/`、`.pi/extensions/`和settings.json扩展源中发现扩展。

```typescript
import { createAgentSession, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  additionalExtensionPaths: ["/path/to/my-extension.ts"],
  extensionFactories: [
    (pi) => {
      pi.on("agent_start", () => {
        console.log("[Inline Extension] Agent starting");
      });
    }
  ]
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

扩展可以注册工具、订阅事件、添加命令等。有关完整的 API，请参见 [extensions.md](extensions.md)。

**命名内联扩展：** 默认情况下，内联工厂在启动扩展列表中显示为 `<inline:1>`、`<inline:2>` 等。要显示描述性名称，请包装工厂：

```typescript
import type { InlineExtension } from "@earendil-works/pi-coding-agent";

const myProvider: InlineExtension = {
  name: "my-provider",
  factory: (pi) => {
    pi.on("agent_start", () => {
      console.log("[my-provider] Agent starting");
    });
  }
};

const loader = new DefaultResourceLoader({
  extensionFactories: [myProvider]
});
```

这会显示为`<inline:my-provider>`而不是`<inline:1>`。为向后兼容，仍然接受裸工厂函数。

**事件总线：**扩展可以通过`pi.events`进行通信。如果需要从外部发出或监听，将共享的`eventBus`传递给`DefaultResourceLoader`：

```typescript
import { createEventBus, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";

const eventBus = createEventBus();
const loader = new DefaultResourceLoader({
  eventBus
});
await loader.reload();

eventBus.on("my-extension:status", (data) => console.log(data));
```

> 参见 [examples/sdk/06-extensions.ts](../examples/sdk/06-extensions.ts) 和 [docs/extensions.md](extensions.md)

### 技能

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  type Skill
} from "@earendil-works/pi-coding-agent";

const customSkill: Skill = {
  name: "my-skill",
  description: "Custom instructions",
  filePath: "/path/to/SKILL.md",
  baseDir: "/path/to",
  source: "custom"
};

const loader = new DefaultResourceLoader({
  skillsOverride: (current) => ({
    skills: [...current.skills, customSkill],
    diagnostics: current.diagnostics
  })
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/04-skills.ts](../examples/sdk/04-skills.ts)

### 上下文文件

```typescript
import { createAgentSession, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  agentsFilesOverride: (current) => ({
    agentsFiles: [
      ...current.agentsFiles,
      { path: "/virtual/AGENTS.md", content: "# Guidelines\n\n- Be concise" }
    ]
  })
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/07-context-files.ts](../examples/sdk/07-context-files.ts)

### 斜杠命令

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  type PromptTemplate
} from "@earendil-works/pi-coding-agent";

const customCommand: PromptTemplate = {
  name: "deploy",
  description: "Deploy the application",
  source: "(custom)",
  content: "# Deploy\n\n1. Build\n2. Test\n3. Deploy"
};

const loader = new DefaultResourceLoader({
  promptsOverride: (current) => ({
    prompts: [...current.prompts, customCommand],
    diagnostics: current.diagnostics
  })
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

> 参见 [examples/sdk/08-prompt-templates.ts](../examples/sdk/08-prompt-templates.ts)

### 会话管理

会话使用树状结构，通过 `id`/`parentId` 链接，支持 in-place 分支。

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSession,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager
} from "@earendil-works/pi-coding-agent";

// In-memory (no persistence)
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory()
});

// New persistent session
const { session: persisted } = await createAgentSession({
  sessionManager: SessionManager.create(process.cwd())
});

// Continue most recent
const { session: continued, modelFallbackMessage } = await createAgentSession({
  sessionManager: SessionManager.continueRecent(process.cwd())
});
if (modelFallbackMessage) {
  console.log("Note:", modelFallbackMessage);
}

// Open specific file
const { session: opened } = await createAgentSession({
  sessionManager: SessionManager.open("/path/to/session.jsonl")
});

// List sessions
const currentProjectSessions = await SessionManager.list(process.cwd());
const allSessions = await SessionManager.listAll(process.cwd());

// Session replacement API for /new, /resume, /fork, /clone, and import flows.
const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent
    })),
    services,
    diagnostics: services.diagnostics
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

// Replace the active session with a fresh one
await runtime.newSession();

// Replace the active session with another saved session
await runtime.switchSession("/path/to/session.jsonl");

// Replace the active session with a fork from a specific user entry
await runtime.fork("entry-id");

// Clone the active path through a specific entry
await runtime.fork("entry-id", { position: "at" });
```

**SessionManager 树 API：**

```typescript
const sm = SessionManager.open("/path/to/session.jsonl");

// Session listing
const currentProjectSessions = await SessionManager.list(process.cwd());
const allSessions = await SessionManager.listAll(process.cwd());

// Tree traversal
const entries = sm.getEntries(); // All entries (excludes header)
const tree = sm.getTree(); // Full tree structure
const path = sm.getPath(); // Path from root to current leaf
const leaf = sm.getLeafEntry(); // Current leaf entry
const entry = sm.getEntry(id); // Get entry by ID
const children = sm.getChildren(id); // Direct children of entry

// Labels
const label = sm.getLabel(id); // Get label for entry
sm.appendLabelChange(id, "checkpoint"); // Set label

// Branching
sm.branch(entryId); // Move leaf to earlier entry
sm.branchWithSummary(id, "Summary..."); // Branch with context summary
sm.createBranchedSession(leafId); // Extract path to new file
```

> 参见 [examples/sdk/11-sessions.ts](../examples/sdk/11-sessions.ts) 和 [会话格式](session-format.md)

### 设置管理

```typescript
import {
  createAgentSession,
  SettingsManager,
  SessionManager
} from "@earendil-works/pi-coding-agent";

// Default: loads from files (global + project merged)
const { session } = await createAgentSession({
  settingsManager: SettingsManager.create()
});

// With overrides
const settingsManager = SettingsManager.create();
settingsManager.applyOverrides({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 5 }
});
const { session } = await createAgentSession({ settingsManager });

// In-memory (no file I/O, for testing)
const { session } = await createAgentSession({
  settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
  sessionManager: SessionManager.inMemory()
});

// Custom directories
const { session } = await createAgentSession({
  settingsManager: SettingsManager.create("/custom/cwd", "/custom/agent")
});
```

**静态工厂方法：**

- `SettingsManager.create(cwd?, agentDir?)` - 从文件加载
- `SettingsManager.inMemory(settings?)` - 无文件 I/O

**项目特定设置：**

设置从两个位置加载并合并：

1. 全局：`~/.pi/agent/settings.json`
2. 项目：`<cwd>/.pi/settings.json`

项目设置覆盖全局设置。嵌套对象合并键。Setter 默认修改全局设置。

**持久化与错误处理语义：**

- 设置 getter/setter 对于 in-memory 状态是同步的。
- Setter 异步入队持久化写入。
- 当需要持久化边界时调用 `await settingsManager.flush()` (例如，在进程退出前或在测试中断言文件内容前)。
- `SettingsManager` 不会打印设置 I/O 错误。请使用 `settingsManager.drainErrors()` 并在你的应用层中报告它们。

> 参见 [examples/sdk/10-settings.ts](../examples/sdk/10-settings.ts)

## ResourceLoader

使用 `DefaultResourceLoader` 来发现扩展、技能、提示词、主题和上下文文件。

```typescript
import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir()
});
await loader.reload();

const extensions = loader.getExtensions();
const skills = loader.getSkills();
const prompts = loader.getPrompts();
const themes = loader.getThemes();
const contextFiles = loader.getAgentsFiles().agentsFiles;
```

## 返回值

`createAgentSession()` 返回：

```typescript
interface CreateAgentSessionResult {
  // The session
  session: AgentSession;

  // Extensions result (for runner setup)
  extensionsResult: LoadExtensionsResult;

  // Warning if session model couldn't be restored
  modelFallbackMessage?: string;
}

interface LoadExtensionsResult {
  extensions: Extension[];
  errors: Array<{ path: string; error: string }>;
  runtime: ExtensionRuntime;
}
```

## 完整示例

```typescript
import { getModel } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  ModelRegistry,
  SessionManager,
  SettingsManager
} from "@earendil-works/pi-coding-agent";

// Set up auth storage (custom location)
const authStorage = AuthStorage.create("/custom/agent/auth.json");

// Runtime API key override (not persisted)
if (process.env.MY_KEY) {
  authStorage.setRuntimeApiKey("anthropic", process.env.MY_KEY);
}

// Model registry (no custom models.json)
const modelRegistry = ModelRegistry.create(authStorage);

// Inline tool
const statusTool = defineTool({
  name: "status",
  label: "Status",
  description: "Get system status",
  parameters: Type.Object({}),
  execute: async () => ({
    content: [{ type: "text", text: `Uptime: ${process.uptime()}s` }],
    details: {}
  })
});

const model = getModel("anthropic", "claude-opus-4-5");
if (!model) throw new Error("Model not found");

// In-memory settings with overrides
const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 2 }
});

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: "/custom/agent",
  settingsManager,
  systemPromptOverride: () => "You are a minimal assistant. Be concise."
});
await loader.reload();

const { session } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: "/custom/agent",

  model,
  thinkingLevel: "off",
  authStorage,
  modelRegistry,

  tools: ["read", "bash", "status"],
  customTools: [statusTool],
  resourceLoader: loader,

  sessionManager: SessionManager.inMemory(),
  settingsManager
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("Get status and list files.");
```

## 运行模式

SDK 导出了运行模式工具，用于在 `createAgentSession()` 之上构建自定义界面：

### InteractiveMode

完整的 TUI 交互模式，包含编辑器、聊天历史记录以及所有 built-in 命令：

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  InteractiveMode,
  SessionManager
} from "@earendil-works/pi-coding-agent";

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics
  };
};
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

const mode = new InteractiveMode(runtime, {
  migratedProviders: [],
  modelFallbackMessage: undefined,
  initialMessage: "Hello",
  initialImages: [],
  initialMessages: []
});

await mode.run();
```

### runPrintMode

单次模式：发送提示词，输出结果，然后退出：

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  runPrintMode,
  SessionManager
} from "@earendil-works/pi-coding-agent";

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics
  };
};
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

await runPrintMode(runtime, {
  mode: "text",
  initialMessage: "Hello",
  initialImages: [],
  messages: ["Follow up"]
});
```

### runRpcMode

用于子进程集成的 JSON-RPC 模式：

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  runRpcMode,
  SessionManager
} from "@earendil-works/pi-coding-agent";

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics
  };
};
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd())
});

await runRpcMode(runtime);
```

有关 JSON 协议，请参阅 [RPC 文档](rpc.md)。

## RPC 模式替代方案

对于无需使用 SDK 构建的 subprocess-based 集成，可直接使用 CLI：

```bash
pi --mode rpc --no-session
```

有关 JSON 协议，请参阅 [RPC 文档](rpc.md)。

在以下情况下，首选 SDK：

- 你需要类型安全
- 你处于同一 Node.js 进程中
- 你需要直接访问代理状态
- 你希望以编程方式自定义工具/扩展

在以下情况下，首选 RPC 模式：

- 你正在从其他语言进行集成
- 你需要进程隔离
- 你正在构建一个 language-agnostic 客户端

## 导出项

主入口点导出：

```typescript
// Factory
createAgentSession
createAgentSessionRuntime
AgentSessionRuntime

// Auth and Models
AuthStorage
ModelRegistry
resolveCliModel
resolveModelScopeWithDiagnostics

// Resource loading
DefaultResourceLoader
type ResourceLoader
createEventBus

// Constants and helpers
CONFIG_DIR_NAME
defineTool
getAgentDir
getPackageDir
getReadmePath
getDocsPath
getExamplesPath

// Session management
SessionManager
SettingsManager

// Tool factories
createCodingTools
createReadOnlyTools
createReadTool, createBashTool, createEditTool, createWriteTool
createGrepTool, createFindTool, createLsTool

// Types
type CreateAgentSessionOptions
type CreateAgentSessionResult
type ExtensionFactory
type InlineExtension
type ExtensionAPI
type ToolDefinition
type Skill
type PromptTemplate
type Tool
```

关于扩展类型，请参阅 [extensions.md](extensions.md) 以获取完整的 API。
