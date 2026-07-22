> pi 可以创建扩展。让它为你的用例构建一个。

# 扩展｜ Extensions

扩展是 TypeScript 模块，用于扩展 pi 的行为。它们可以订阅生命周期事件、注册 LLM 可调用的自定义工具、添加命令等。

> **/reload 的存放位置：** 将扩展放在 `~/.pi/agent/extensions/` (全局) 或 `.pi/extensions/` (project-local) 用于 auto-discovery。仅用于快速测试时使用 `pi -e ./path.ts`。位于 auto-discovered 位置的扩展可以通过 `/reload` 进行 hot-reloaded。

**关键能力：**
- **自定义工具** - 注册 LLM 可以通过 `pi.registerTool()` 调用的工具
- **事件拦截** - 阻止或修改工具调用、注入上下文、自定义压缩
- **用户交互** - 通过 `ctx.ui` (选择、确认、输入、通知) 提示用户
- **自定义 UI 组件** - 通过 `ctx.ui.custom()` 实现带有键盘输入的完整 TUI 组件，用于复杂交互
- **自定义命令** - 通过 `pi.registerCommand()` 注册类似 `/mycommand` 的命令
- **会话持久化** - 通过 `pi.appendEntry()` 存储在重启后仍存活的状态
- **自定义渲染** - 控制工具调用/结果和消息在 TUI 中的显示方式

**示例用例：**
- 权限门控 (在 `rm -rf`、`sudo` 等之前确认)
- Git 检查点 (每次交互时暂存，分支上恢复)
- 路径保护 (阻止写入 `.env`、`node_modules/`)
- 自定义压缩 (按你的方式总结对话)
- 对话摘要 (参见 `summarize.ts` 示例)
- 交互式工具 (问题、向导、自定义对话框)
- 有状态工具 (待办事项列表、连接池)
- 外部集成 (文件监视器、Webhooks、CI 触发器)
- 等待时的游戏 (见 `snake.ts` 示例)

查看 [examples/extensions/](../examples/extensions/) 了解实际实现。

## 目录｜ Table of Contents

- [快速开始｜ Quick Start](#quick-start)
- [扩展位置｜扩展 Locations](#extension-locations)
- [可用导入｜ Available Imports](#available-imports)
- [编写扩展｜ Writing an 扩展](#writing-an-extension)
  - [扩展样式｜扩展 Styles](#extension-styles)
- [事件｜ Events](#events)
  - [生命周期概述｜ Lifecycle Overview](#lifecycle-overview)
  - [资源事件｜ Resource Events](#resource-events)
  - [会话事件｜会话 Events](#session-events)
  - [代理事件｜代理 Events](#agent-events)
  - [模型事件｜ Model Events](#model-events)
  - [工具事件｜ Tool Events](#tool-events)
- [ExtensionContext](#extensioncontext)
- [ExtensionCommandContext](#extensioncommandcontext)
- [ExtensionAPI 方法](#extensionapi-methods)
- [状态管理｜ State Management](#state-management)
- [自定义工具｜ Custom Tools](#custom-tools)
  - [动态工具加载｜ Dynamic Tool Loading](#dynamic-tool-loading)
- [自定义 UI ｜ Custom UI](#custom-ui)
- [错误处理｜ Error Handling](#error-handling)
- [模式行为｜ Mode Behavior](#mode-behavior)
- [示例参考｜ Examples Reference](#examples-reference)

## 快速开始｜ Quick Start

创建 `~/.pi/agent/extensions/my-extension.ts`：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // React to events
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Dangerous!", "Allow rm -rf?");
      if (!ok) return { block: true, reason: "Blocked by user" };
    }
  });

  // Register a custom tool
  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone by name",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });

  // Register a command
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || "world"}!`, "info");
    },
  });
}
```

使用 `--extension` (或 `-e`) 标志测试：

```bash
pi -e ./my-extension.ts
```

## 扩展位置｜扩展 Locations

> **安全：** 扩展以完整系统权限运行，可执行任意代码。仅从可信来源安装。

扩展是来自受信任位置的 auto-discovered。项目本地 `.pi/extensions` 条目仅在项目被信任后才加载。

| 位置｜ Location | 范围 |
|----------|-------|
| `~/.pi/agent/extensions/*.ts` | 全局 (所有项目) |
| `~/.pi/agent/extensions/*/index.ts` | 全局 (子目录) |
| `.pi/extensions/*.ts` | 项目本地 |
| `.pi/extensions/*/index.ts` | 项目本地 (子目录) |

通过 `settings.json` 的附加路径：

```json
{
  "packages": [
    "npm:@foo/bar@1.0.0",
    "git:github.com/user/repo@v1"
  ],
  "extensions": [
    "/path/to/local/extension.ts",
    "/path/to/local/extension/dir"
  ]
}
```

要通过 npm or git as pi 包分享扩展，请参阅 [packages.md](packages.md)。

## 可用导入

| 包 | 用途 |
|---------|---------|
| `@earendil-works/pi-coding-agent` | 扩展类型 (`ExtensionAPI`、`ExtensionContext`、events) |
| `typebox` | 工具参数的 Schema 定义 |
| `@earendil-works/pi-ai` | AI 工具函数 (`StringEnum` 用于 Google 兼容的枚举) |
| `@earendil-works/pi-tui` | TUI 组件用于自定义渲染 |

npm dependencies 也同样有效。在扩展旁 (或父目录中)添加一个 `package.json`，运行 `npm install`，从 `node_modules/` 的导入会自动解析。

对于通过 `pi install` (npm or git) 安装的分布式 pi 包，运行时依赖必须位于 `dependencies` 中。包安装默认使用生产安装 (`npm install --omit=dev`)，因此 `devDependencies` 在运行时不可用；当配置了 `npmCommand` 时， git packages 使用普通的 `install` 以确保与包装器兼容。

Node.js built-ins (`node:fs`, `node:path`, 等) 也可用。

## 编写扩展｜ Writing an 扩展

扩展导出一个默认工厂函数，该函数接收 `ExtensionAPI`。工厂函数可以是同步或异步的：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Subscribe to events
  pi.on("event_name", async (event, ctx) => {
    // ctx.ui for user interaction
    const ok = await ctx.ui.confirm("Title", "Are you sure?");
    ctx.ui.notify("Done!", "info");
    ctx.ui.setStatus("my-ext", "Processing...");  // Footer status
    ctx.ui.setWidget("my-ext", ["Line 1", "Line 2"]);  // Widget above editor (default)
  });

  // Register tools, commands, shortcuts, flags
  pi.registerTool({ ... });
  pi.registerCommand("name", { ... });
  pi.registerShortcut("ctrl+x", { ... });
  pi.registerFlag("my-flag", { ... });
}
```

扩展通过 [jiti](https://github.com/unjs/jiti) 加载，因此 TypeScript 无需编译即可工作。

如果工厂函数返回一个 `Promise`， pi 会在继续启动前等待它。这意味着异步初始化在 `session_start` 之前、在 `resources_discover` 之前、以及通过 `pi.registerProvider()` 排队的模型提供商注册被刷新之前完成。

### 异步工厂函数｜ Async factory functions

对 one-time 启动工作使用异步工厂，例如获取远程配置或动态发现可用模型。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default async function (pi: ExtensionAPI) {
  const response = await fetch("http://localhost:1234/v1/models");
  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      name?: string;
      context_window?: number;
      max_tokens?: number;
    }>;
  };

  pi.registerProvider("local-openai", {
    baseUrl: "http://localhost:1234/v1",
    apiKey: "$LOCAL_OPENAI_API_KEY",
    api: "openai-completions",
    models: payload.data.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.context_window ?? 128000,
      maxTokens: model.max_tokens ?? 4096,
    })),
  });
}
```

这种模式使得获取的模型在正常启动期间以及对于 `pi --list-models` 可用。

### 长期资源与关闭｜ Long-lived resources and shutdown

扩展工厂函数可能在从不启动会话的调用中运行。不要在工厂函数中启动后台资源，例如进程、套接字、文件监视器或定时器。

将后台资源启动推迟到 `session_start` 或需要该资源的命令/工具/事件。注册一个幂等的 `session_shutdown` 处理器以关闭您启动的任何 session-scoped 资源。

### 扩展风格｜扩展 Styles

**单文件** - 最简单的，适用于小型扩展：

```
~/.pi/agent/extensions/
└── my-extension.ts
```

**带有 index.ts 的目录** - 适用于 multi-file 扩展：

```
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts        # Entry point (exports default function)
    ├── tools.ts        # Helper module
    └── utils.ts        # Helper module
```

**带有依赖的包** - 适用于需要 npm packages 的扩展：

```
~/.pi/agent/extensions/
└── my-extension/
    ├── package.json    # Declares dependencies and entry points
    ├── package-lock.json
    ├── node_modules/   # After npm install
    └── src/
        └── index.ts
```

```json
// package.json
{
  "name": "my-extension",
  "dependencies": {
    "zod": "^3.0.0",
    "chalk": "^5.0.0"
  },
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

在扩展目录中运行 `npm install`，然后来自 `node_modules/` 的导入自动生效。

## 事件｜ Events

### 生命周期概述｜ Lifecycle Overview

```
pi starts
  │
  ├─► project_trust (user/global and CLI extensions only, before project resources load)
  ├─► session_start { reason: "startup" }
  └─► resources_discover { reason: "startup" }
      │
      ▼
user sends prompt ─────────────────────────────────────────┐
  │                                                        │
  ├─► (extension commands checked first, bypass if found)  │
  ├─► input (can intercept, transform, or handle)          │
  ├─► (skill/template expansion if not handled)            │
  ├─► before_agent_start (can inject message, modify system prompt)
  ├─► agent_start                                          │
  ├─► message_start / message_update / message_end         │
  │                                                        │
  │   ┌─── turn (repeats while LLM calls tools) ───┐       │
  │   │                                            │       │
  │   ├─► turn_start                               │       │
  │   ├─► context (can modify messages)            │       │
  │   ├─► before_provider_headers (can mutate headers)     |
  │   ├─► before_provider_request (can inspect or replace payload)
  │   ├─► after_provider_response (status + headers, before stream consume)
  │   │                                            │       │
  │   │   LLM responds, may call tools:            │       │
  │   │     ├─► tool_execution_start               │       │
  │   │     ├─► tool_call (can block)              │       │
  │   │     ├─► tool_execution_update              │       │
  │   │     ├─► tool_result (can modify)           │       │
  │   │     └─► tool_execution_end                 │       │
  │   │                                            │       │
  │   └─► turn_end                                 │       │
  │                                                        │
  ├─► agent_end                                            │
  └─► agent_settled (no retry/compaction/follow-up left)   │
                                                           │
user sends another prompt ◄────────────────────────────────┘

/new (new session) or /resume (switch session)
  ├─► session_before_switch (can cancel)
  ├─► session_shutdown
  ├─► session_start { reason: "new" | "resume", previousSessionFile? }
  └─► resources_discover { reason: "startup" }

/fork or /clone
  ├─► session_before_fork (can cancel)
  ├─► session_shutdown
  ├─► session_start { reason: "fork", previousSessionFile }
  └─► resources_discover { reason: "startup" }

/name or pi.setSessionName()
  └─► session_info_changed

/compact or auto-compaction
  ├─► session_before_compact (can cancel or customize)
  └─► session_compact

/tree navigation
  ├─► session_before_tree (can cancel or customize)
  └─► session_tree

/model or Ctrl+P (model selection/cycling)
  ├─► thinking_level_select (if model change changes/clamps thinking level)
  └─► model_select

thinking level changes (settings, keybinding, pi.setThinkingLevel())
  └─► thinking_level_select

exit (Ctrl+C, Ctrl+D, SIGHUP, SIGTERM)
  └─► session_shutdown
```

### 启动事件｜ Startup Events

#### 项目_信任

在 pi 决定是否信任具有动态配置 (`.pi` 或 `.agents/skills`) 的项目之前触发。它在启动期间以及当会话替换 (例如 `/resume`) 进入一个在当前进程中信任尚未解析的工作目录时运行。只有用户/全局扩展和 CLI `-e` 扩展参与；project-local 扩展直到信任解析后才加载。

```typescript
pi.on("project_trust", async (event, ctx) => {
  // event.cwd - current working directory
  // ctx has a limited trust context: cwd, mode, hasUI, and select/confirm/input/notify UI helpers
  if (await ctx.ui.confirm("Trust project?", event.cwd)) {
    return { trusted: "yes", remember: true };
  }
  return { trusted: "undecided" };
});
```

一个 `project_trust` 处理器必须返回 `{ trusted: "yes" | "no" | "undecided" }`。用户/全局或 CLI 扩展如果返回 `"yes"` 或 `"no"` 则拥有决定权；第一个是/否决定胜出，并抑制 built-in 信任提示。使用 `remember: true` 持久化是/否决定；否则仅适用于当前进程。返回 `"undecided"` 让后续处理器或 built-in 信任流程决定。在提示前检查 `ctx.hasUI`。如果没有处理器返回是/否，则正常信任解析继续：首先应用保存的 `trust.json` 决定，然后 `defaultProjectTrust` 控制 pi 是否询问、信任或默认拒绝。

### 资源事件｜ Resource Events

#### 资源_发现

在`session_start`之后触发，以便扩展可以贡献额外的技能、提示词和主题路径。
启动路径使用`reason: "startup"`。重新加载使用`reason: "reload"`。

```typescript
pi.on("resources_discover", async (event, _ctx) => {
  // event.cwd - current working directory
  // event.reason - "startup" | "reload"
  return {
    skillPaths: ["/path/to/skills"],
    promptPaths: ["/path/to/prompts"],
    themePaths: ["/path/to/themes"],
  };
});
```

### 会话事件｜会话 Events

参见[会话 Format](session-format.md)了解会话存储内部机制以及SessionManager API。

#### 会话_start

当会话启动、加载或重新加载时触发。

```typescript
pi.on("session_start", async (event, ctx) => {
  // event.reason - "startup" | "reload" | "new" | "resume" | "fork"
  // event.previousSessionFile - present for "new", "resume", and "fork"
  ctx.ui.notify(`Session: ${ctx.sessionManager.getSessionFile() ?? "ephemeral"}`, "info");
});
```

#### 会话_info_changed

当通过`/name`、RPC或`pi.setSessionName()`设置当前会话显示名称时触发。

```typescript
pi.on("session_info_changed", async (event, ctx) => {
  // event.name - current normalized name, or undefined if cleared
  ctx.ui.notify(`Session renamed: ${event.name ?? "(none)"}`, "info");
});
```

#### 会话_before_switch

在启动新会话(`/new`)或切换会话(`/resume`)之前触发。

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  // event.reason - "new" or "resume"
  // event.targetSessionFile - session we're switching to (only for "resume")

  if (event.reason === "new") {
    const ok = await ctx.ui.confirm("Clear?", "Delete all messages?");
    if (!ok) return { cancel: true };
  }
});
```

在成功切换或new-session操作后， pi 为旧的扩展实例发出`session_shutdown`，为新会话重新加载并重新绑定扩展，然后发出带有`reason: "new" | "resume"`和`previousSessionFile`的`session_start`。
在`session_shutdown`中进行清理工作，然后在`session_start`中重建任何in-memory状态。

#### 会话_before_fork

当通过`/fork`分支或通过`/clone`克隆时触发。

```typescript
pi.on("session_before_fork", async (event, ctx) => {
  // event.entryId - ID of the selected entry
  // event.position - "before" for /fork, "at" for /clone
  return { cancel: true }; // Cancel fork/clone
  // OR
  return { skipConversationRestore: true }; // Reserved for future conversation restore control
});
```

在成功分支或克隆后， pi 为旧的扩展实例发出`session_shutdown`，为新会话重新加载并重新绑定扩展，然后发出带有`reason: "fork"`和`previousSessionFile`的`session_start`。
在`session_shutdown`中进行清理工作，然后在`session_start`中重建任何in-memory状态。

#### 会话_before_compact / 会话_compact

在上下文压缩时触发。详情请参见[compaction.md](compaction.md)。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // reason - "manual" (/compact), "threshold", or "overflow"
  // willRetry - whether the aborted turn is retried after compaction (overflow recovery)

  // Cancel:
  return { cancel: true };

  // Custom summary:
  return {
    compaction: {
      summary: "...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // Optional; included in session totals
    }
  };
});

pi.on("session_compact", async (event, ctx) => {
  // event.compactionEntry - the saved compaction
  // event.fromExtension - whether extension provided it
  // event.reason - "manual" (/compact), "threshold", or "overflow"
  // event.willRetry - whether the aborted turn is retried after compaction (overflow recovery)
});
```

#### 会话_before_tree / 会话_tree

在`/tree`导航时触发。关于树形导航概念，请参见[Sessions](sessions.md)。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;
  return { cancel: true };
  // OR provide custom summary:
  return {
    summary: {
      summary: "...",
      // usage: summaryResponse.usage, // Optional; included in session totals
      details: {},
    },
  };
});

pi.on("session_tree", async (event, ctx) => {
  // event.newLeafId, oldLeafId, summaryEntry, fromExtension
});
```

#### 会话_shutdown

在已启动的会话运行时被销毁之前触发。使用此事件清理从`session_start`或其他session-scoped钩子打开的資源。

```typescript
pi.on("session_shutdown", async (event, ctx) => {
  // event.reason - "quit" | "reload" | "new" | "resume" | "fork"
  // event.targetSessionFile - destination session for session replacement flows
  // Cleanup, save state, etc.
});
```

### 代理事件｜代理 Events

#### before_代理_start

在用户提交提示词之后、代理循环之前触发。可以注入消息和/或修改系统提示词。

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // event.prompt - user's prompt text
  // event.images - attached images (if any)
  // event.systemPrompt - current chained system prompt for this handler
  //   (includes changes from earlier before_agent_start handlers)
  // event.systemPromptOptions - structured options used to build the system prompt
  //   .customPrompt - any custom system prompt (from --system-prompt, SYSTEM.md, or custom templates)
  //   .selectedTools - tools currently active in the prompt
  //   .toolSnippets - one-line descriptions for each tool
  //   .promptGuidelines - custom guideline bullets
  //   .appendSystemPrompt - text from --append-system-prompt flags
  //   .cwd - working directory
  //   .contextFiles - AGENTS.md files and other loaded context files
  //   .skills - loaded skills

  return {
    // Inject a persistent message (stored in session, sent to LLM)
    message: {
      customType: "my-extension",
      content: "Additional context for the LLM",
      display: true,
    },
    // Replace the system prompt for this turn (chained across extensions)
    systemPrompt: event.systemPrompt + "\n\nExtra instructions for this turn...",
  };
});
```

`systemPromptOptions`字段使扩展能够访问Pi用于构建系统提示词的相同结构化数据。这让你能够检查Pi已加载的内容——自定义提示词、指导原则、工具片段、上下文文件、技能——而无需re-discovering资源或re-parsing标志。当你的扩展需要在尊重user-provided配置的同时对系统提示词进行深入、有依据的修改时，请使用此字段。

在`before_agent_start`内部，`event.systemPrompt`和`ctx.getSystemPrompt()`都反映了当前处理程序时的链式系统提示词。后续的`before_agent_start`处理程序仍然可以再次修改它。

#### 代理_start / 代理_end / 代理_settled

`agent_start` 在 low-level 代理运行开始时触发。`agent_end` 在该运行结束时触发，但 Pi 可能仍会 auto-retry、auto-compact 和重试，或继续处理排队的 follow-up 消息。对于需要了解 Pi 不会自动继续运行的状态集成，请使用 `agent_settled`。

```typescript
pi.on("agent_start", async (_event, ctx) => {});

pi.on("agent_end", async (event, ctx) => {
  // event.messages - messages from this low-level run
});

pi.on("agent_settled", async (_event, ctx) => {
  // ctx.isIdle() is true here unless another extension started a new run.
});
```

#### turn_start / turn_end

每次轮次触发 (一次 LLM 响应 + 工具调用)。

```typescript
pi.on("turn_start", async (event, ctx) => {
  // event.turnIndex, event.timestamp
});

pi.on("turn_end", async (event, ctx) => {
  // event.turnIndex, event.message, event.toolResults
});
```

#### message_start / message_update / message_end

在消息生命周期更新时触发。

- `message_start` 和 `message_end` 在用户、助手和 toolResult 消息时触发。
- `message_update` 在助手流式更新时触发。
- `message_end` 处理程序可以返回 `{ message }` 来替换已最终确定的消息。替换后的消息必须保持相同的 `role`。

```typescript
pi.on("message_start", async (event, ctx) => {
  // event.message
});

pi.on("message_update", async (event, ctx) => {
  // event.message
  // event.assistantMessageEvent (token-by-token stream event)
});

pi.on("message_end", async (event, ctx) => {
  if (event.message.role !== "assistant") return;

  return {
    message: {
      ...event.message,
      usage: {
        ...event.message.usage,
        cost: {
          ...event.message.usage.cost,
          total: 0.123,
        },
      },
    },
  };
});
```

#### tool_execution_start / tool_execution_update / tool_execution_end

在工具执行生命周期更新时触发。

在并行工具模式下：
- `tool_execution_start` 在预检阶段在助手 source order 中发出
- `tool_execution_update` 事件可能跨工具交错发生
- `tool_execution_end` 在每个工具完成之后按工具完成顺序发出
- 最终的 `toolResult` 消息事件稍后仍然在助手 source order 中发出

```typescript
pi.on("tool_execution_start", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args
});

pi.on("tool_execution_update", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args, event.partialResult
});

pi.on("tool_execution_end", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.result, event.isError
});
```

#### context

在每次 LLM 调用前触发。修改消息 non-destructively。有关消息类型，请参阅 [会话 Format](session-format.md)。

```typescript
pi.on("context", async (event, ctx) => {
  // event.messages - deep copy, safe to modify
  const filtered = event.messages.filter(m => !shouldPrune(m));
  return { messages: filtered };
});
```

#### before_模型提供商_headers

在出站 HTTP 头部组装完成后触发。用于添加、覆盖或删除请求头部。

处理程序就地修改 `event.headers`。将键设置为字符串以添加或覆盖，或设置为 `null` 以删除。

```typescript
pi.on("before_provider_headers", (event, ctx) => {
  // Add or override — e.g. a session id for gateway tracing/attribution
  event.headers["x-session-id"] = ctx.sessionManager.getSessionId();

  // Drop a tracking header pi adds for this call
  event.headers["X-OpenRouter-Title"] = null;
});
```

每个模型提供商请求运行一次；重试时重用相同的头部，而不是 re-firing 该钩子。

#### before_模型提供商_request

在 provider-specific 载荷构建完成后、请求发送前触发。处理程序按扩展加载顺序运行。返回 `undefined` 保持载荷不变。返回任何其他值将替换后续处理程序以及实际请求的载荷。

此钩子可以重写 provider-level 系统指令或完全移除它们。这些 payload-level 更改不会反映在 `ctx.getSystemPrompt()` 中，后者报告的是 Pi 的系统提示字符串，而不是最终序列化的模型提供商载荷。

```typescript
pi.on("before_provider_request", (event, ctx) => {
  console.log(JSON.stringify(event.payload, null, 2));

  // Optional: replace payload
  // return { ...event.payload, temperature: 0 };
});
```

这主要用于调试模型提供商的序列化和缓存行为。

#### after_模型提供商_response

在收到 HTTP 响应后、消费其流式内容之前触发。处理程序按扩展加载顺序执行。

```typescript
pi.on("after_provider_response", (event, ctx) => {
  // event.status - HTTP status code
  // event.headers - normalized response headers
  if (event.status === 429) {
    console.log("rate limited", event.headers["retry-after"]);
  }
});
```

头信息的可用性取决于模型提供商和传输方式。抽象了 HTTP 响应的模型提供商可能不会暴露头信息。

### 模型事件｜ Model Events

#### model_select

当通过 `/model` 命令、模型循环 (`Ctrl+P`) 或会话恢复导致模型更改时触发。

```typescript
pi.on("model_select", async (event, ctx) => {
  // event.model - newly selected model
  // event.previousModel - previous model (undefined if first selection)
  // event.source - "set" | "cycle" | "restore"

  const prev = event.previousModel
    ? `${event.previousModel.provider}/${event.previousModel.id}`
    : "none";
  const next = `${event.model.provider}/${event.model.id}`;

  ctx.ui.notify(`Model changed (${event.source}): ${prev} -> ${next}`, "info");
});
```

使用此事件可在活动模型更改时更新 UI 元素 (状态栏、页脚) 或执行 model-specific 初始化。

#### thinking_level_select

当思考级别更改时触发。此事件是 notification-only；处理程序的返回值被忽略。

```typescript
pi.on("thinking_level_select", async (event, ctx) => {
  // event.level - newly selected thinking level
  // event.previousLevel - previous thinking level

  ctx.ui.setStatus("thinking", `thinking: ${event.level}`);
});
```

当 `pi.setThinkingLevel()`、模型更改或 built-in thinking-level 控件更改活动思考级别时，使用此事件更新扩展 UI。

### 工具事件｜ Tool Events

#### tool_call

在 `tool_execution_start` 之后、工具执行之前触发。**可阻塞**。使用 `isToolCallEventType` 缩小范围并获取类型化输入。

在 `tool_call` 运行之前， pi 会等待之前发出的 代理 事件通过 `AgentSession` 排干。这意味着 `ctx.sessionManager` 在当前的助手 tool-calling 消息中是最新的。

在默认的并行工具执行模式下，同一助手消息中的兄弟工具调用先按顺序预检查，然后并发执行。`tool_call` 不保证在 `ctx.sessionManager` 中看到同一助手消息的兄弟工具结果。

`event.input` 是可变的。在执行前就地修改它以修补工具参数。

行为保证：
- 对 `event.input` 的修改会影响实际的工具执行
- 后续的 `tool_call` 处理程序会看到先前处理程序的修改
- 修改后不执行 re-validation
- 来自 `tool_call` 的返回值仅通过 `{ block: true, reason?: string }` 控制阻塞

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  // event.toolName - "bash", "read", "write", "edit", etc.
  // event.toolCallId
  // event.input - tool parameters (mutable)

  // Built-in tools: no type params needed
  if (isToolCallEventType("bash", event)) {
    // event.input is { command: string; timeout?: number }
    event.input.command = `source ~/.profile\n${event.input.command}`;

    if (event.input.command.includes("rm -rf")) {
      return { block: true, reason: "Dangerous command" };
    }
  }

  if (isToolCallEventType("read", event)) {
    // event.input is { path: string; offset?: number; limit?: number }
    console.log(`Reading: ${event.input.path}`);
  }
});
```

#### 为自定义工具输入添加类型

自定义工具应导出其输入类型：

```typescript
// my-extension.ts
export type MyToolInput = Static<typeof myToolSchema>;
```

使用带有显式类型参数的 `isToolCallEventType`：

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import type { MyToolInput } from "my-extension";

pi.on("tool_call", (event) => {
  if (isToolCallEventType<"my_tool", MyToolInput>("my_tool", event)) {
    event.input.action;  // typed
  }
});
```

#### tool_result

在工具执行完成之后、`tool_execution_end` 以及最终工具结果消息事件被触发之前触发。**可以修改结果。**

在并行工具模式下，`tool_result` 和 `tool_execution_end` 可能按工具完成顺序交错出现，而最终的 `toolResult` 消息事件稍后在 assistant source order. 中仍会触发

`tool_result` 处理器像中间件一样链式执行：
- 处理器按扩展加载顺序运行
- 每个处理器看到之前处理器更改后的最新结果
- 处理器可以返回部分补丁 (`content`、`details`、`isError` 或 `usage`)；省略的字段保留其当前值

在处理器内部使用 `ctx.signal` 进行嵌套异步工作。这允许 Esc 取消模型调用、`fetch()` 以及扩展启动的其他 abort-aware 操作。

```typescript
import { isBashToolResult } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event, ctx) => {
  // event.toolName, event.toolCallId, event.input
  // event.content, event.details, event.isError, event.usage

  if (isBashToolResult(event)) {
    // event.details is typed as BashToolDetails
  }

  const response = await fetch("https://example.com/summarize", {
    method: "POST",
    body: JSON.stringify({ content: event.content }),
    signal: ctx.signal,
  });

  // Modify result:
  return { content: [...], details: {...}, isError: false, usage: nestedModelUsage };
});
```

### 用户 Bash 事件｜ User Bash Events

#### user_bash

当用户执行 `!` 或 `!!` 命令时触发。**可以拦截。**

```typescript
import { createLocalBashOperations } from "@earendil-works/pi-coding-agent";

pi.on("user_bash", (event, ctx) => {
  // event.command - the bash command
  // event.excludeFromContext - true if !! prefix
  // event.cwd - working directory

  // Option 1: Provide custom operations (e.g., SSH)
  return { operations: remoteBashOps };

  // Option 2: Wrap pi's built-in local bash backend
  const local = createLocalBashOperations();
  return {
    operations: {
      exec(command, cwd, options) {
        return local.exec(`source ~/.profile\n${command}`, cwd, options);
      }
    }
  };

  // Option 3: Full replacement - return result directly
  return { result: { output: "...", exitCode: 0, cancelled: false, truncated: false } };
});
```

### 输入事件｜ Input Events

#### input

当收到用户输入时触发，在扩展命令检查之后但在技能和模板扩展之前。该事件看到原始输入文本，因此 `/skill:foo` 和 `/template` 尚未展开。

**处理顺序：**
1. 扩展命令 (`/cmd`) 首先检查——如果找到，则处理器运行并跳过输入事件
2. `input` 事件触发——可以拦截、转换或处理
3. 如果未处理：技能命令 (`/skill:name`) 展开为技能内容
4. 如果未处理：提示词模板 (`/template`) 展开为模板内容
5. 代理处理开始 (`before_agent_start` 等)

```typescript
pi.on("input", async (event, ctx) => {
  // event.text - raw input (before skill/template expansion)
  // event.images - attached images, if any
  // event.source - "interactive" (typed), "rpc" (API), or "extension" (via sendUserMessage)
  // event.streamingBehavior - "steer" | "followUp" | undefined
  //   undefined when idle, "steer" for mid-stream interrupts,
  //   "followUp" for messages queued until the agent finishes

  // Transform: rewrite input before expansion
  if (event.text.startsWith("?quick "))
    return { action: "transform", text: `Respond briefly: ${event.text.slice(7)}` };

  // Handle: respond without LLM (extension shows its own feedback)
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }

  // Route by source: skip processing for extension-injected messages
  if (event.source === "extension") return { action: "continue" };

  // Intercept skill commands before expansion
  if (event.text.startsWith("/skill:")) {
    // Could transform, block, or let pass through
  }

  return { action: "continue" };  // Default: pass through to expansion
});
```

**结果：**
- `continue`——原样通过 (如果处理器未返回任何内容则为默认值)
- `transform` - 修改文本/图像，然后继续扩展
- `handled` - 完全跳过代理 (第一个返回此值的处理程序获胜)

跨处理程序转换链。参见 [input-transform.ts](../examples/extensions/input-transform.ts) 和 [input-transform-streaming.ts](../examples/extensions/input-transform-streaming.ts) 了解 `streamingBehavior` 感知的路由。

## ExtensionContext

所有处理程序都接收 `ctx: ExtensionContext`。

### ctx.ui

用于用户交互的 UI 方法。详见 [自定义 UI](#custom-ui)。

### ctx.mode

当前运行模式：`"tui"`、`"rpc"`、`"json"` 或 `"print"`。使用 `ctx.mode === "tui"` 来保护 terminal-only 功能，例如 `custom()`、组件工厂、终端输入和直接 TUI 渲染。

### ctx.hasUI

在 TUI 和 RPC 模式下为 `true`。在打印模式 (`-p`) 和 JSON 模式下为 `false`。使用此方法来保护在 TUI 和 RPC 模式下均可工作的对话框方法 (`select`、`confirm`、`input`、`editor`) 和 fire-and-forget 方法 (`notify`、`setStatus`、`setWidget`、`setTitle`、`setEditorText`)。在 RPC 模式下，某些 TUI 特定的方法是 no-ops 或返回默认值 (参见 [rpc.md](rpc.md#extension-ui-protocol))。

### ctx.cwd

当前工作目录。

在构造 project-local 配置路径时，请使用 `CONFIG_DIR_NAME` 而不是硬编码 `.pi`。重新分发的版本可能使用不同的配置目录名称。

```typescript
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const projectConfigPath = join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json");
    // ...
  });
}
```

### ctx.isProjectTrusted()

返回当前会话上下文中是否激活了 project-local 信任。这包括临时信任决策和 CLI 信任覆盖，而不仅仅是全局信任存储中已保存的决策。

在读取仅应对受信任项目生效的 project-local 扩展配置之前，使用此方法。

### ctx.sessionManager

对会话状态的只读访问。有关完整的 SessionManager API 和条目类型，请参见 [会话格式](session-format.md)。

对于 `tool_call`，此状态在处理程序运行前通过当前助手消息同步。在并行工具执行模式下，仍然不能保证包含来自同一助手消息的兄弟工具结果。

```typescript
ctx.sessionManager.getEntries()             // All entries
ctx.sessionManager.getBranch()              // Current branch
ctx.sessionManager.buildContextEntries()    // Active branch entries with compaction applied
ctx.sessionManager.getLeafId()              // Current leaf entry ID
```

### ctx.modelRegistry / ctx.model

访问模型、提供商和已解析的身份验证。`ctx.modelRegistry.getProvider(id)` 返回有效的 pi-ai 提供商，而 `getProviderAuth(id)` 解析其当前的 API 密钥、标头、基础 URL 和 provider-scoped 环境，无需加载模型。`ctx.model` 是活动模型。

### ctx.signal

当前代理的中止信号，如果当前没有代理轮次活动，则为 `undefined`。

将此用于由扩展处理器启动的abort-aware嵌套工作，例如：
- `fetch(..., { signal: ctx.signal })`
- 接受`signal`的模型调用
- 接受`AbortSignal`的文件或进程助手

`ctx.signal`通常在活跃轮次事件中定义，例如`tool_call`、`tool_result`、`message_update`和`turn_end`。
在空闲或non-turn上下文中，它通常是`undefined`，例如在 pi 空闲时触发的会话事件、扩展命令和快捷方式。

```typescript
pi.on("tool_result", async (event, ctx) => {
  const response = await fetch("https://example.com/api", {
    method: "POST",
    body: JSON.stringify(event),
    signal: ctx.signal,
  });

  const data = await response.json();
  return { details: data };
});
```

### ctx.isIdle() / ctx.abort() / ctx.hasPendingMessages()

控制流辅助工具。当Pi正在处理代理运行、自动重试、auto-compaction重试或排队延续时，`ctx.isIdle()`为 false。

### ctx.shutdown()

请求优雅地关闭 pi。

- **交互模式：**延迟执行，直到代理在处理完所有排队的引导和follow-up消息(后变为空闲状态)。
- **RPC 模式：** 推迟到下一个空闲状态(在完成当前命令响应后，等待下一个命令时)。
- **打印模式：**无操作。当所有提示处理完毕后，进程自动退出。

在退出前向所有扩展发出`session_shutdown`事件。在所有上下文中可用(事件处理器、工具、命令、快捷方式)。

```typescript
pi.on("tool_call", (event, ctx) => {
  if (isFatal(event.input)) {
    ctx.shutdown();
  }
});
```

### ctx.getContextUsage()

返回活跃模型的当前上下文使用情况。如果可用，使用最后的助手使用量，然后估计后续消息的令牌数。

```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) {
  // ...
}
```

### ctx.compact()

触发上下文压缩而不等待完成。对于follow-up操作，请使用`onComplete`和`onError`。

```typescript
ctx.compact({
  customInstructions: "Focus on recent changes",
  onComplete: (result) => {
    ctx.ui.notify("Compaction completed", "info");
  },
  onError: (error) => {
    ctx.ui.notify(`Compaction failed: ${error.message}`, "error");
  },
});
```

### ctx.getSystemPrompt()

返回Pi的当前系统提示词字符串。

- 在`before_agent_start`期间，此值反映了当前轮次迄今为止所做的链式system-prompt更改。
- 它不包括后续的`context`消息变更。
- 它不包括`before_provider_request`载荷重写。
- 如果later-loaded扩展在您的扩展之后运行，它们仍然可以更改最终发送的内容。

```typescript
pi.on("before_agent_start", (event, ctx) => {
  const prompt = ctx.getSystemPrompt();
  console.log(`System prompt length: ${prompt.length}`);
});
```

## ExtensionCommandContext

命令处理程序接收 `ExtensionCommandContext`，它通过会话控制方法扩展了 `ExtensionContext`。这些方法仅在命令中可用，因为如果在事件处理程序中调用，可能会导致死锁。

### ctx.getSystemPromptOptions()

返回 Pi 当前用于构建系统提示词的基础输入。

```typescript
const options = ctx.getSystemPromptOptions();
const contextPaths = options.contextFiles?.map((file) => file.path) ?? [];
```

其形状和可变性与 `before_agent_start` `event.systemPromptOptions` 相同：自定义提示词、活动工具、工具片段、提示词指南、附加的系统提示词文本、cwd、加载的上下文文件以及加载的技能。它可能包含完整的上下文文件内容，因此请将其视为敏感的 extension-local 数据，并避免通过命令列表、日志或自动完成元数据暴露它。

这报告当前的基础提示词输入。它不包括 per-turn `before_agent_start` 链式 system-prompt 更改、后续的 `context` 事件消息变更或 `before_provider_request` 载荷重写。

### ctx.waitForIdle()

等待代理完全稳定，包括自动重试、auto-compaction 重试和排队的延续：

```typescript
pi.registerCommand("my-cmd", {
  handler: async (args, ctx) => {
    await ctx.waitForIdle();
    // Agent is now idle, safe to modify session
  },
});
```

### ctx.newSession(options?)

创建一个新的会话：

```typescript
const parentSession = ctx.sessionManager.getSessionFile();
const kickoff = "Continue in the replacement session";

const result = await ctx.newSession({
  parentSession,
  setup: async (sm) => {
    sm.appendMessage({
      role: "user",
      content: [{ type: "text", text: "Context from previous session..." }],
      timestamp: Date.now(),
    });
  },
  withSession: async (ctx) => {
    // Use only the replacement-session ctx here.
    await ctx.sendUserMessage(kickoff);
  },
});

if (result.cancelled) {
  // An extension cancelled the new session
}
```

选项：
- `parentSession`：要记录在新会话头部中的父会话文件
- `setup`：在 `withSession` 运行之前变更新会话的 `SessionManager`
- `withSession`：在全新的 replacement-session 上下文上运行 post-switch 工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见 [会话 replacement lifecycle and footguns](#session-replacement-lifecycle-and-footguns)。

### ctx.fork(entryId, options?)

从特定条目分叉，创建一个新的会话文件：

```typescript
const result = await ctx.fork("entry-id-123", {
  withSession: async (ctx) => {
    // Use only the replacement-session ctx here.
    ctx.ui.notify("Now in the forked session", "info");
  },
});
if (result.cancelled) {
  // An extension cancelled the fork
}

const cloneResult = await ctx.fork("entry-id-456", { position: "at" });
if (cloneResult.cancelled) {
  // An extension cancelled the clone
}
```

选项：
- `position`：`"before"` (default) 在选定的用户消息之前分叉，将该提示词恢复到编辑器中
- `position`：`"at"` 复制通过选定条目的活动路径，而不恢复编辑器文本
- `withSession`：在全新的 replacement-session 上下文上运行 post-switch 工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见 [会话 replacement lifecycle and footguns](#session-replacement-lifecycle-and-footguns)。

### ctx.navigateTree(targetId, options?)

导航到会话树中的不同点：

```typescript
const result = await ctx.navigateTree("entry-id-456", {
  summarize: true,
  customInstructions: "Focus on error handling changes",
  replaceInstructions: false, // true = replace default prompt entirely
  label: "review-checkpoint",
});
```

选项：
- `summarize`：是否生成已放弃分支的摘要
- `customInstructions`：摘要生成器的自定义指令
- `replaceInstructions`: 如果为 true ，则 `customInstructions` 替换默认提示词而非附加到其后
- `label`: 附加到分支摘要条目的标签 (或目标条目（如果不进行摘要）)

### ctx.switchSession(sessionPath, options?)

切换到不同的会话文件：

```typescript
const result = await ctx.switchSession("/path/to/session.jsonl", {
  withSession: async (ctx) => {
    await ctx.sendUserMessage("Resume work in the replacement session");
  },
});
if (result.cancelled) {
  // An extension cancelled the switch via session_before_switch
}
```

选项：
- `withSession`: 让 post-switch 在新的 replacement-session 上下文中工作。不要使用捕获的旧 `pi` / 命令 `ctx`；参见 [会话替换生命周期与陷阱](#session-replacement-lifecycle-and-footguns).

要发现可用的会话，请使用静态方法 `SessionManager.list()` 或 `SessionManager.listAll()`：

```typescript
import { SessionManager } from "@earendil-works/pi-coding-agent";

pi.registerCommand("switch", {
  description: "Switch to another session",
  handler: async (args, ctx) => {
    const sessions = await SessionManager.list(ctx.cwd);
    if (sessions.length === 0) return;
    const choice = await ctx.ui.select(
      "Pick session:",
      sessions.map(s => s.file),
    );
    if (choice) {
      await ctx.switchSession(choice, {
        withSession: async (ctx) => {
          ctx.ui.notify("Switched session", "info");
        },
      });
    }
  },
});
```

### 会话替换生命周期与陷阱｜会话 replacement lifecycle and footguns

`withSession` 接收一个新的 `ReplacedSessionContext`，它扩展了 `ExtensionCommandContext`，并添加了绑定到替换会话的异步 `sendMessage()` 和 `sendUserMessage()` 辅助方法。

生命周期与陷阱：
- `withSession` 仅在旧会话已发出 `session_shutdown`、旧运行时已被拆除、替换会话已重新绑定，且新扩展实例已收到 `session_start` 之后才运行。
- 该回调仍在原始闭包中执行，而非在新的扩展实例内部。这意味着在 `withSession` 启动之前，您的旧扩展实例可能已经执行了其关闭清理。
- 捕获的旧 `pi` / 旧命令 `ctx` session-bound 对象在替换后已失效，使用时会抛出异常。请仅使用传递给 `withSession` 的 `ctx` 进行 session-bound 工作。
- 先前提取的原始对象仍由您自己负责。例如，如果在替换前捕获了 `const sm = ctx.sessionManager`，那么 `sm` 仍然是旧的 `SessionManager` 对象。替换后请勿重复使用。
- `withSession` 中的代码应假定任何由您的 `session_shutdown` 处理程序失效的状态都已消失。仅捕获能在关闭时安全存活的纯数据，如字符串、id 和序列化配置。

安全模式：

```typescript
pi.registerCommand("handoff", {
  handler: async (_args, ctx) => {
    const kickoff = "Continue from the replacement session";
    await ctx.newSession({
      withSession: async (ctx) => {
        await ctx.sendUserMessage(kickoff);
      },
    });
  },
});
```

不安全模式：

```typescript
pi.registerCommand("handoff", {
  handler: async (_args, ctx) => {
    const oldSessionManager = ctx.sessionManager;
    await ctx.newSession({
      withSession: async (_ctx) => {
        // stale old objects: do not do this
        oldSessionManager.getSessionFile();
        pi.sendUserMessage("wrong");
      },
    });
  },
});
```

### ctx.reload()

运行与 `/reload` 相同的重新加载流程。

```typescript
pi.registerCommand("reload-runtime", {
  description: "Reload extensions, skills, prompts, themes, and context files",
  handler: async (_args, ctx) => {
    await ctx.reload();
    return;
  },
});
```

重要行为：
- `await ctx.reload()` 为当前扩展运行时发出 `session_shutdown`
- 然后重新加载资源，并使用 `reason: "reload"` 发出 `session_start`，并以原因 `"reload"` 发出 `resources_discover`
- 当前正在运行的命令处理程序仍会在旧调用帧中继续
- `await ctx.reload()` 之后的代码仍从 pre-reload 版本运行
- `await ctx.reload()` 之后的代码不得假设旧的 in-memory 扩展状态仍然有效
- 处理器返回后，后续的命令/事件/工具调用将使用新的扩展版本

为了可预测的行为，将重新加载视为该处理器的终止操作 (`await ctx.reload(); return;`)。

工具在 `ExtensionContext` 下运行，因此它们不能直接调用 `ctx.reload()`。请使用命令作为重新加载的入口点，然后公开一个工具，将该命令作为 follow-up 用户消息排入队列。

示例工具，LLM 可调用以触发重新加载：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("reload-runtime", {
    description: "Reload extensions, skills, prompts, themes, and context files",
    handler: async (_args, ctx) => {
      await ctx.reload();
      return;
    },
  });

  pi.registerTool({
    name: "reload_runtime",
    label: "Reload Runtime",
    description: "Reload extensions, skills, prompts, themes, and context files",
    parameters: Type.Object({}),
    async execute() {
      pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
      return {
        content: [{ type: "text", text: "Queued /reload-runtime as a follow-up command." }],
      };
    },
  });
}
```

## ExtensionAPI 方法

### pi.on(事件、处理器)

订阅事件。事件类型和返回值请参见 [Events](#events)。

### pi.registerTool(定义)

注册一个可由 LLM 调用的自定义工具。完整详情请参见 [Custom Tools](#custom-tools)。

`pi.registerTool()` 在扩展加载期间和启动后均可工作。您可以在 `session_start`、命令处理器或其他事件处理器中调用它。新工具在同一会话中立即刷新，因此它们会出现在 `pi.getAllTools()` 中，并且无需 `/reload` 即可被 LLM 调用。

使用 `pi.setActiveTools()` 在运行时启用或禁用工具 (包括动态添加的工具)。

使用 `promptSnippet` 将自定义工具加入 `Available tools` 中的 one-line 条目，工具激活时使用 `promptGuidelines` 将 tool-specific 列表项追加到默认的 `Guidelines` 部分。

**重要提示：** `promptGuidelines` 列表项会平铺追加到 `Guidelines` 部分，不带工具名称前缀。每条指南必须指明其引用的工具——避免使用“当…时使用此工具”，因为 LLM 无法判断“此”指代哪个工具。请改为“当…时使用 my_tool”。

完整示例请参见 [dynamic-tools.ts](../examples/extensions/dynamic-tools.ts)。

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does",
  promptSnippet: "Summarize or transform text according to action",
  promptGuidelines: ["Use my_tool when the user asks to summarize previously generated text."],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    // Optional compatibility shim. Runs before schema validation.
    // Return the current schema shape, for example to fold legacy fields
    // into the modern parameter object.
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Stream progress
    onUpdate?.({ content: [{ type: "text", text: "Working..." }] });

    return {
      content: [{ type: "text", text: "Done" }],
      details: { result: "..." },
    };
  },

  // Optional: Custom rendering
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

### pi.sendMessage(消息、选项？)

向会话中注入一条自定义消息。自定义消息参与 LLM 上下文。对于不应发送给 LLM 的持久性纯 TUI 内容，请使用 [`pi.appendEntry()`](#piappendentrycustomtype-data) 配合 [`pi.registerEntryRenderer()`](#piregisterentryrenderercustomtype-renderer)。

```typescript
pi.sendMessage({
  customType: "my-extension",
  content: "Message text",
  display: true,
  details: { ... },
}, {
  triggerTurn: true,
  deliverAs: "steer",
});
```

**选项：**
- `deliverAs` - 投递模式：
  - `"steer"` (默认) - 消息在流式传输时排队。在当前助理轮次完成执行其工具调用后、下次 LLM 调用之前投递。
  - `"followUp"` - 等待代理完成。仅当代理没有更多工具调用时投递。
  - `"nextTurn"` - 为下一个用户提示排队。不会中断或触发任何操作。
- `triggerTurn: true` - 如果代理空闲，立即触发 LLM 响应。仅适用于 `"steer"` 和 `"followUp"` 模式 (对 `"nextTurn"` 模式忽略)。

### pi.sendUserMessage(内容、选项？)

向代理发送一条用户消息。与发送自定义消息的 `sendMessage()` 不同，此方法发送的是实际的用户消息，看起来就像用户输入的一样。始终会触发一个轮次。

```typescript
// Simple text message
pi.sendUserMessage("What is 2+2?");

// With content array (text + images)
pi.sendUserMessage([
  { type: "text", text: "Describe this image:" },
  { type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } },
]);

// During streaming - must specify delivery mode
pi.sendUserMessage("Focus on error handling", { deliverAs: "steer" });
pi.sendUserMessage("And then summarize", { deliverAs: "followUp" });
```

**选项：**
- `deliverAs` - 当代理正在流式传输时必需：
  - `"steer"` - 在当前助理轮次执行完其工具调用后排队投递消息
  - `"followUp"` - 等待代理完成所有工具调用

当不流式传输时，消息立即发送并触发新一轮。当流式传输时若没有`deliverAs`，则会抛出错误。

查看[send-user-message.ts](../examples/extensions/send-user-message.ts)以获取完整示例。

### pi.appendEntry(customType, data?)

持久化扩展数据。自定义条目NOT参与LLM上下文。在交互模式下，当与`pi.registerEntryRenderer()`配对时，它们还可以在聊天记录中渲染。

```typescript
pi.appendEntry("my-state", { count: 42 });
pi.appendEntry("status-card", { title: "Indexed files", count: 17 });

// Restore on reload
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === "my-state") {
      // Reconstruct from entry.data
    }
  }
});
```

### pi.setSessionName(name)

设置会话显示名称(（在会话选择器中显示，而非第一条消息）)。

```typescript
pi.setSessionName("Refactor auth module");
```

### pi.getSessionName()

获取当前会话名称（如果已设置）。

```typescript
const name = pi.getSessionName();
if (name) {
  console.log(`Session: ${name}`);
}
```

### pi.setLabel(entryId, label)

设置或清除条目上的标签。标签是user-defined用于书签和导航的标记(，显示在`/tree`选择器中)。

```typescript
// Set a label
pi.setLabel(entryId, "checkpoint-before-refactor");

// Clear a label
pi.setLabel(entryId, undefined);

// Read labels via sessionManager
const label = ctx.sessionManager.getLabel(entryId);
```

标签在会话中持久存在，重启后仍保留。使用它们标记对话树中的重要节点(（如对话轮次、检查点）)。

### pi.registerCommand(name, options)

注册一个命令。

如果多个扩展注册了相同的命令名称， pi 会保留所有命令，并按加载顺序分配数字调用后缀，例如 `/review:1` 和 `/review:2`。

```typescript
pi.registerCommand("stats", {
  description: "Show session statistics",
  handler: async (args, ctx) => {
    const count = ctx.sessionManager.getEntries().length;
    ctx.ui.notify(`${count} entries`, "info");
  }
});
```

可选：为 `/command ...` 添加参数 auto-completion：

```typescript
import type { AutocompleteItem } from "@earendil-works/pi-tui";

pi.registerCommand("deploy", {
  description: "Deploy to an environment",
  getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
    const envs = ["dev", "staging", "prod"];
    const items = envs.map((e) => ({ value: e, label: e }));
    const filtered = items.filter((i) => i.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Deploying: ${args}`, "info");
  },
});
```

### pi.getCommands()

获取当前会话中可通过 `prompt` 调用的斜杠命令。包括扩展命令、提示词模板和技能命令。
该列表与 RPC `get_commands` 排序一致：扩展优先，然后是模板，最后是技能。

```typescript
const commands = pi.getCommands();
const bySource = commands.filter((command) => command.source === "extension");
const userScoped = commands.filter((command) => command.sourceInfo.scope === "user");
```

每个条目具有以下形状：

```typescript
{
  name: string; // Invokable command name without the leading slash. May be suffixed like "review:1"
  description?: string;
  source: "extension" | "prompt" | "skill";
  sourceInfo: {
    path: string;
    source: string;
    scope: "user" | "project" | "temporary";
    origin: "package" | "top-level";
    baseDir?: string;
  };
}
```

使用 `sourceInfo` 作为规范的来源字段。不要从命令名称或临时路径解析中推断所有权。

内置交互命令(（如 `/model` 和 `/settings`）)不在此列表中。它们仅在交互
模式下处理，如果通过 `prompt` 发送则不会执行。

### pi.registerMessageRenderer(customType, renderer)

为自定义消息注册一个带有您的 `customType` 的自定义 TUI 渲染器。自定义消息通过 `pi.sendMessage()` 创建，并参与 LLM 上下文。参见 [Custom UI](#custom-ui)。

### pi.registerEntryRenderer(customType, renderer)

为自定义条目注册一个带有您的 `customType` 的自定义 TUI 渲染器。自定义条目通过 `pi.appendEntry()` 创建，不参与 LLM 上下文。

```typescript
import { Box, Text } from "@earendil-works/pi-tui";

pi.registerEntryRenderer("status-card", (entry, { expanded }, theme) => {
  const data = entry.data as { title: string; count: number };
  const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
  box.addChild(new Text(`${theme.bold(data.title)}: ${data.count}`));
  if (expanded) {
    box.addChild(new Text(theme.fg("dim", JSON.stringify(data, null, 2))));
  }
  return box;
});

pi.appendEntry("status-card", { title: "Indexed files", count: 17 });
```

### pi.registerShortcut(快捷键， 选项)

注册一个键盘快捷键。有关快捷键格式和built-in按键绑定，请参见[keybindings.md](keybindings.md)。

```typescript
pi.registerShortcut("ctrl+shift+p", {
  description: "Toggle plan mode",
  handler: async (ctx) => {
    ctx.ui.notify("Toggled!");
  },
});
```

### pi.registerFlag(名称， 选项)

注册一个CLI标志。

```typescript
pi.registerFlag("plan", {
  description: "Start in plan mode",
  type: "boolean",
  default: false,
});

// Check value
if (pi.getFlag("plan")) {
  // Plan mode enabled
}
```

### pi.exec(命令， 参数， 选项？)

执行一个 shell 命令。

```typescript
const result = await pi.exec("git", ["status"], { signal, timeout: 5000 });
// result.stdout, result.stderr, result.code, result.killed
```

### pi.getActiveTools() / pi.getAllTools() / pi.setActiveTools(名称)

管理活动工具。这适用于built-in工具和动态注册的工具。`pi.getActiveTools()`将活动工具名称作为`string[]`返回；`pi.getAllTools()`返回所有已配置工具的元数据。

```typescript
const active = pi.getActiveTools(); // ["read", "bash", ...]
const all = pi.getAllTools();
// all = [{
//   name: "read",
//   description: "Read file contents...",
//   parameters: ...,
//   promptGuidelines: ["Use read to examine files instead of cat or sed."],
//   sourceInfo: { path: "<builtin:read>", source: "builtin", scope: "temporary", origin: "top-level" }
// }, ...]
const builtinTools = all.filter((t) => t.sourceInfo.source === "builtin");
const extensionTools = all.filter((t) => t.sourceInfo.source !== "builtin" && t.sourceInfo.source !== "sdk");
pi.setActiveTools([...new Set([...active, "my_custom_tool"])]); // Keep current tools and enable my_custom_tool
pi.setActiveTools(["read", "bash"]); // Switch to read-only
```

`pi.getAllTools()`返回`name`、`description`、`parameters`、`promptGuidelines`和`sourceInfo`。

典型的`sourceInfo.source`值：
- `builtin`用于built-in工具
- `sdk`用于通过`createAgentSession({ customTools })`传递的工具
- 扩展source metadata用于扩展注册的工具

### pi.setModel(模型)

设置当前模型。如果该模型没有可用的API密钥，则返回`false`。有关配置自定义模型，请参见[models.md](models.md)。

```typescript
const model = ctx.modelRegistry.find("anthropic", "claude-sonnet-4-5");
if (model) {
  const success = await pi.setModel(model);
  if (!success) {
    ctx.ui.notify("No API key for this model", "error");
  }
}
```

### pi.getThinkingLevel() / pi.setThinkingLevel(级别)

获取或设置思考级别。级别被限制为模型的能力(non-reasoning模型始终使用“off”)。更改时触发`thinking_level_select`。

```typescript
const current = pi.getThinkingLevel();  // "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
pi.setThinkingLevel("high");
```

### pi.events

用于扩展之间通信的共享事件总线：

```typescript
pi.events.on("my:event", (data) => { ... });
pi.events.emit("my:event", { ... });
```

### pi.registerProvider(名称， 配置)

动态注册或覆盖一个模型提供商。适用于代理、自定义端点或team-wide模型配置。

在扩展工厂函数期间进行的调用会被排队，并在运行器初始化后应用。之后进行的调用——例如用户设置流程后从命令处理器发出的调用——立即生效，无需`/reload`。

动态提供商可以实现`refreshModels`。Pi在模型刷新时调用它，通过提供商同步发布返回的列表，并传递标准的凭证/存储/网络/信号上下文。扩展决定是否通过`context.store`持久化目录；像llama.cpp这样的实时服务器可以忽略它。

需要原生提供商认证、过滤、刷新或流行为的扩展可以从`@earendil-works/pi-ai`注册一个完整的`Provider`。该提供商成为组合基础，`models.json`覆盖仍在其之上应用。

```typescript
import { createProvider, openAICompletionsApi } from "@earendil-works/pi-ai";

const provider = createProvider({
  id: "local-server",
  name: "Local Server",
  baseUrl: "http://localhost:8080/v1",
  auth: {
    apiKey: {
      name: "Local server setup",
      async login(interaction) {
        return {
          type: "api_key",
          key: await interaction.prompt({ type: "secret", message: "API key" }),
        };
      },
      async resolve({ credential }) {
        return credential?.key
          ? { auth: { apiKey: credential.key }, source: "stored API key" }
          : undefined;
      },
    },
  },
  models: [],
  api: openAICompletionsApi(),
});

pi.registerProvider(provider);

// Register a new provider with custom models
pi.registerProvider("my-proxy", {
  name: "My Proxy",
  baseUrl: "https://proxy.example.com",
  apiKey: "$PROXY_API_KEY",  // env var reference
  api: "anthropic-messages",
  models: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet (proxy)",
      reasoning: false,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 16384
    }
  ]
});

// Register a live llama.cpp catalog without persisting discovered models
pi.registerProvider("llama.cpp", {
  baseUrl: "http://localhost:8080/v1",
  apiKey: "local",
  api: "openai-completions",
  async refreshModels({ signal }) {
    const response = await fetch("http://localhost:8080/v1/models", { signal });
    const { data } = await response.json();
    return data.map(({ id }) => ({
      id,
      name: id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 16384
    }));
  }
});

// Override baseUrl for an existing provider (keeps all models)
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com"
});

// Register provider with OAuth support for /login
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate AI (SSO)",
    async login(callbacks) {
      // Custom OAuth flow
      callbacks.onAuth({ url: "https://sso.corp.com/..." });
      const code = await callbacks.onPrompt({ message: "Enter code:" });
      return { refresh: code, access: code, expires: Date.now() + 3600000 };
    },
    async refreshToken(credentials) {
      // Refresh logic
      return credentials;
    },
    getApiKey(credentials) {
      return credentials.access;
    }
  }
});
```

对象形式接受完整的pi-ai`Provider`，包括原生`auth`、`getModels`、`refreshModels`、`filterModels`、`stream`和`streamSimple`行为。

**旧版配置选项：**
- `name` - 提供商的 UI 显示名称，例如`/login`。
- `baseUrl` - API端点URL。定义模型时必填。
- `apiKey` - API密钥字面量、环境插值(`$ENV_VAR`或`${ENV_VAR}`)，或以`!command`开头。定义模型时必填(除非提供了`oauth`)。`$`转义``apiKey` - API密钥字面量、环境插值(`$ENV_VAR`或`${ENV_VAR}`)，或以`!command`开头。定义模型时必填(除非提供了`oauth`)。`$`转义，`$!`转义字面量`!`而不触发命令执行。
- `api` - API类型：`"anthropic-messages"`、`"openai-completions"`、`"openai-responses"`等。
- `headers` - 要包含在请求中的自定义标头。
- `authHeader` - 如果为 true ，会自动添加`Authorization: Bearer`标头。
- `models` - 模型定义数组。如果提供，将替换该提供商的所有现有模型。模型定义可以设置`baseUrl`来覆盖该模型的提供商端点。
- `refreshModels` - 异步动态发现回调。其返回的模型替换extension-provided模型。仅在结果应持久化时使用作用域`context.store`。
- `oauth` - 用于`/login`支持的 OAuth 提供商配置。如果提供，该提供商将出现在登录菜单中。
- `streamSimple` - 用于non-standardAPI 的自定义流式实现。

有关高级主题（自定义流式 API、OAuth 详情、模型定义参考），请参阅[custom-provider.md](custom-provider.md)。

### pi.unregisterProvider(名称)

移除之前注册的提供商及其模型。被该提供商覆盖的内置模型将被恢复。如果提供商未注册，则不起作用。

与`registerProvider`类似，在初始加载阶段之后调用时立即生效，因此不需要`/reload`。

```typescript
pi.registerCommand("my-setup-teardown", {
  description: "Remove the custom proxy provider",
  handler: async (_args, _ctx) => {
    pi.unregisterProvider("my-proxy");
  },
});
```

## 状态管理｜ State Management

带状态的扩展应将其存储在工具结果`details`中，以支持分支：

```typescript
export default function (pi: ExtensionAPI) {
  let items: string[] = [];

  // Reconstruct state from session
  pi.on("session_start", async (_event, ctx) => {
    items = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult") {
        if (entry.message.toolName === "my_tool") {
          items = entry.message.details?.items ?? [];
        }
      }
    }
  });

  pi.registerTool({
    name: "my_tool",
    // ...
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      items.push("new item");
      return {
        content: [{ type: "text", text: "Added" }],
        details: { items: [...items] },  // Store for reconstruction
      };
    },
  });
}
```

## 自定义工具｜ Custom Tools

注册LLM可通过`pi.registerTool()`调用的工具。工具会出现在系统提示词中，并可以自定义渲染。

使用`promptSnippet`在默认系统提示词的`Available tools`部分中创建一个简短的one-line条目。如果省略，自定义工具将被排除在该部分之外。

使用`promptGuidelines`向默认系统提示词的`Guidelines`部分添加tool-specific要点。这些要点仅在工具激活时包含(例如，在`pi.setActiveTools([...])`之后)。

**重要提示：**`promptGuidelines`要点以扁平方式附加到`Guidelines`部分，不带工具名称前缀或分组。每条指南必须指明其引用的工具名称——避免使用“使用此工具时。..”，因为LLM无法区分“此”指的是哪个工具。请改用“使用我的_工具时。..”。

注意：某些模型可能包含 @ 前缀在工具路径参数中。内置工具在解析路径前会去除开头的 @。如果你的自定义工具接受路径，也应标准化开头的 @。

如果您的自定义工具修改文件，请使用 `withFileMutationQueue()`，以便它参与与 built-in `edit` 和 `write` 相同的 per-file 队列。这很重要，因为默认情况下工具调用是并行运行的。没有队列，两个工具可能会读取相同的旧文件内容，计算不同的更新，然后后写入的会覆盖先前的。

示例失败案例：在同一个助手轮次中，您的自定义工具编辑 `foo.ts`，而 built-in `edit` 也更改 `foo.ts`。如果您的工具未参与队列，两者都可能读取原始 `foo.ts`，应用各自的更改，导致其中一个更改丢失。

将真实的文件路径传递给 `withFileMutationQueue()`，而不是原始用户参数。先将其解析为绝对路径，相对于 `ctx.cwd` 或您工具的工作目录。对于现有文件，助手通过 `realpath()` 进行规范化，因此同一文件的符号链接别名共享一个队列。对于新文件，它会回退到解析后的绝对路径，因为还没有任何内容可以 `realpath()`。

在该目标路径上对整个变异窗口进行排队。这包括 read-modify-write 逻辑，而不仅仅是最终的写入操作。

```typescript
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);

  return withFileMutationQueue(absolutePath, async () => {
    await mkdir(dirname(absolutePath), { recursive: true });
    const current = await readFile(absolutePath, "utf8");
    const next = current.replace(params.oldText, params.newText);
    await writeFile(absolutePath, next, "utf8");

    return {
      content: [{ type: "text", text: `Updated ${params.path}` }],
      details: {},
    };
  });
}
```

### 工具定义｜ Tool Definition

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does (shown to LLM)",
  promptSnippet: "List or add items in the project todo list",
  promptGuidelines: [
    "Use my_tool for todo planning instead of direct file edits when the user asks for a task list."
  ],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),  // Use StringEnum for Google compatibility
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    if (!args || typeof args !== "object") return args;
    const input = args as { action?: string; oldAction?: string };
    if (typeof input.oldAction === "string" && input.action === undefined) {
      return { ...input, action: input.oldAction };
    }
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Check for cancellation
    if (signal?.aborted) {
      return { content: [{ type: "text", text: "Cancelled" }] };
    }

    // Stream progress updates
    onUpdate?.({
      content: [{ type: "text", text: "Working..." }],
      details: { progress: 50 },
    });

    // Run commands via pi.exec (captured from extension closure)
    const result = await pi.exec("some-command", [], { signal });

    // Return result
    return {
      content: [{ type: "text", text: "Done" }],  // Sent to LLM
      details: { data: result },                   // For rendering & state
      // usage: nestedModelResponse.usage,          // Optional nested LLM usage
      // Optional: stop after this tool batch when every finalized tool result
      // in the batch also returns terminate: true.
      terminate: true,
    };
  },

  // Optional: Custom rendering
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

**用量统计：** 如果工具进行嵌套的 LLM 调用，请将其组合的 `Usage` 作为 `usage` 返回。Pi 将其持久化在工具结果中，并包含在页脚、`/session` 和 RPC 会话总计中。`tool_result` 处理程序可以检查或替换此值。

**错误信号：** 要将工具执行标记为失败 (在结果上设置 `isError: true` 并向 LLM 报告)，请从 `execute` 抛出错误。返回值永远不会设置错误标志，无论您在返回对象中包含什么属性。

**提前终止：** 从 `execute()` 返回 `terminate: true` 以提示在当前工具批次后应跳过自动的 follow-up LLM 调用。这仅在批次中所有最终化的工具结果都是终止性的时才生效。参见 [examples/extensions/structured-output.ts](../examples/extensions/structured-output.ts) 获取一个最小示例，其中代理在最终的 structured-output 工具调用后结束。

```typescript
// Correct: throw to signal an error
async execute(toolCallId, params) {
  if (!isValid(params.input)) {
    throw new Error(`Invalid input: ${params.input}`);
  }
  return { content: [{ type: "text", text: "OK" }], details: {} };
}
```

**重要：** 对于字符串枚举，请使用 `@earendil-works/pi-ai` 中的 `StringEnum`。`Type.Union`/`Type.Literal` 不适用于 Google 的 API。

**参数准备：** `prepareArguments(args)` 是可选的。如果定义了，它会在模式验证之前和 `execute()` 之前运行。当 Pi 恢复旧会话且其存储的工具调用参数不再匹配当前模式时，使用它来模拟旧的已接受输入形状。返回您希望根据 `parameters` 验证的对象。保持公共模式严格。不要为了保持旧的恢复会话工作而向 `parameters` 添加已弃用的兼容性字段。

示例：一个旧会话可能包含带 top-level `oldText` 和 `newText` 的 `edit` 工具调用，而当前模式只接受 `edits: [{ oldText, newText }]`。

```typescript
pi.registerTool({
  name: "edit",
  label: "Edit",
  description: "Edit a single file using exact text replacement",
  parameters: Type.Object({
    path: Type.String(),
    edits: Type.Array(
      Type.Object({
        oldText: Type.String(),
        newText: Type.String(),
      }),
    ),
  }),
  prepareArguments(args) {
    if (!args || typeof args !== "object") return args;

    const input = args as {
      path?: string;
      edits?: Array<{ oldText: string; newText: string }>;
      oldText?: unknown;
      newText?: unknown;
    };

    if (typeof input.oldText !== "string" || typeof input.newText !== "string") {
      return args;
    }

    return {
      ...input,
      edits: [...(input.edits ?? []), { oldText: input.oldText, newText: input.newText }],
    };
  },
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // params now matches the current schema
    return {
      content: [{ type: "text", text: `Applying ${params.edits.length} edit block(s)` }],
      details: {},
    };
  },
});
```

### 覆盖内置工具｜ Overriding Built-in Tools

扩展可以通过注册同名的工具来覆盖 built-in 工具 (`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`)。交互模式在发生此情况时显示警告。

```bash
# Extension's read tool replaces built-in read
pi -e ./tool-override.ts
```

或者，使用 `--no-builtin-tools` 在不启用任何 built-in 工具的情况下启动，同时保持扩展工具启用：
```bash
# No built-in tools, only extension tools
pi --no-builtin-tools -e ./my-extension.ts
```

参见 [examples/extensions/tool-override.ts](../examples/extensions/tool-override.ts) 获取一个完整的示例，该示例通过日志记录和访问控制覆盖了 `read`。

**渲染：** 内置渲染器继承按插槽解析。执行覆盖和渲染覆盖是独立的。如果您的覆盖省略了 `renderCall`，则使用 built-in `renderCall`。如果您的覆盖省略了 `renderResult`，则使用 built-in `renderResult`。如果您的覆盖两者都省略，则自动使用 built-in 渲染器 (语法高亮、差异等)。这使得您可以包装 built-in 工具以进行日志记录或访问控制，而无需重新实现 UI。

**提示元数据：** `promptSnippet` 和 `promptGuidelines` 不会从 built-in 工具继承。如果您的覆盖应保留这些提示指令，请在覆盖中显式定义它们。

**您的实现必须匹配精确的结果形状**，包括 `details` 类型。UI 和会话逻辑依赖于这些形状进行渲染和状态跟踪。

内置工具实现：
- [read.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/read.ts) - `ReadToolDetails`
- [bash.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/bash.ts) - `BashToolDetails`
- [edit.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/edit.ts)
- [write.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/write.ts)
- [grep.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/grep.ts) - `GrepToolDetails`
- [find.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/find.ts) - `FindToolDetails`
- [ls.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/core/tools/ls.ts) - `LsToolDetails`

### 远程执行｜ Remote Execution

内置工具支持可插拔操作，用于将任务委托给远程系统(SSH、容器等)：

```typescript
import { createReadTool, createBashTool, type ReadOperations } from "@earendil-works/pi-coding-agent";

// Create tool with custom operations
const remoteRead = createReadTool(cwd, {
  operations: {
    readFile: (path) => sshExec(remote, `cat ${path}`),
    access: (path) => sshExec(remote, `test -r ${path}`).then(() => {}),
  }
});

// Register, checking flag at execution time
pi.registerTool({
  ...remoteRead,
  async execute(id, params, signal, onUpdate, _ctx) {
    const ssh = getSshConfig();
    if (ssh) {
      const tool = createReadTool(cwd, { operations: createRemoteOps(ssh) });
      return tool.execute(id, params, signal, onUpdate);
    }
    return localRead.execute(id, params, signal, onUpdate);
  },
});
```

**操作接口：** `ReadOperations`, `WriteOperations`, `EditOperations`, `BashOperations`, `LsOperations`, `GrepOperations`, `FindOperations`

对于 `user_bash`，扩展可以通过 `createLocalBashOperations()` 重用 pi 的本地 shell 后端，而无需重新实现本地进程创建、shell 解析和 process-tree 终止。

bash 工具还支持一个 spawn 钩子，用于在执行前调整命令、cwd 或环境变量：

```typescript
import { createBashTool } from "@earendil-works/pi-coding-agent";

const bashTool = createBashTool(cwd, {
  spawnHook: ({ command, cwd, env }) => ({
    command: `source ~/.profile\n${command}`,
    cwd: `/mnt/sandbox${cwd}`,
    env: { ...env, CI: "1" },
  }),
});
```

请参阅 [examples/extensions/ssh.ts](../examples/extensions/ssh.ts) 获取一个使用 `--ssh` 标志的完整 SSH 示例。

### 输出截断｜ Output Truncation

**工具 MUST 会截断其输出**，以避免压垮 LLM 上下文。大型输出可能导致：
- 上下文溢出错误 (提示词过长)
- 压缩失败
- 模型性能下降

built-in 的限制为 **50KB** (~10K tokens) 和 **2000 行**，以先达到者为准。使用导出的截断工具：

```typescript
import {
  truncateHead,      // Keep first N lines/bytes (good for file reads, search results)
  truncateTail,      // Keep last N lines/bytes (good for logs, command output)
  truncateLine,      // Truncate a single line to maxBytes with ellipsis
  formatSize,        // Human-readable size (e.g., "50KB", "1.5MB")
  DEFAULT_MAX_BYTES, // 50KB
  DEFAULT_MAX_LINES, // 2000
} from "@earendil-works/pi-coding-agent";

async execute(toolCallId, params, signal, onUpdate, ctx) {
  const output = await runCommand();

  // Apply truncation
  const truncation = truncateHead(output, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  let result = truncation.content;

  if (truncation.truncated) {
    // Write full output to temp file
    const tempFile = writeTempFile(output);

    // Inform the LLM where to find complete output
    result += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines`;
    result += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
    result += ` Full output saved to: ${tempFile}]`;
  }

  return { content: [{ type: "text", text: result }] };
}
```

**要点：**
- 对于开头重要的内容 (搜索结果、文件读取)，使用 `truncateHead`
- 对于结尾重要的内容 (日志、命令输出)，使用 `truncateTail`
- 当输出被截断时，始终告知 LLM 以及在哪里 find the 完整版本
- 在工具的描述中记录截断限制

请参阅 [examples/extensions/truncated-tool.ts](../examples/extensions/truncated-tool.ts) 获取一个完整示例，该示例包装了 `rg` (ripgrep) 并进行了适当的截断。

### 多工具｜ Multiple Tools

一个扩展可以注册多个共享状态的工具：

```typescript
export default function (pi: ExtensionAPI) {
  let connection = null;

  pi.registerTool({ name: "db_connect", ... });
  pi.registerTool({ name: "db_query", ... });
  pi.registerTool({ name: "db_close", ... });

  pi.on("session_shutdown", async () => {
    connection?.close();
  });
}
```

### 自定义渲染｜ Custom Rendering

工具可以提供 `renderCall` 和 `renderResult` 用于自定义 TUI 显示。请参阅 [tui.md](tui.md) 了解完整的组件 API，以及 [tool-execution.ts](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/src/modes/interactive/components/tool-execution.ts) 了解工具行的组合方式。

默认情况下，工具输出被包裹在一个处理内边距和背景的 `Box` 中。定义的 `renderCall` 或 `renderResult` 必须返回一个 `Component`。如果未定义插槽渲染器，`tool-execution.ts` 将对该插槽使用回退渲染。

当工具应渲染自己的外壳而不是使用默认的 `Box` 时，设置 `renderShell: "self"`。这对于需要完全控制框架或背景行为的工具很有用，例如在工具稳定后必须保持视觉稳定的大型预览。

```typescript
pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "Custom shell example",
  parameters: Type.Object({}),
  renderShell: "self",
  async execute() {
    return { content: [{ type: "text", text: "ok" }], details: undefined };
  },
  renderCall(args, theme, context) {
    return new Text(theme.fg("accent", "my custom shell"), 0, 0);
  },
});
```

`renderCall` 和 `renderResult` 各自接收一个包含以下内容的 `context` 对象：
- `args` - 当前工具调用参数
- `state` - 跨 `renderCall` 和 `renderResult` 共享的 row-local 状态
- `lastComponent` - 该插槽之前返回的组件（如果有）
- `invalidate()` - 请求重新渲染此工具行
- `toolCallId`、`cwd`、`executionStarted`、`argsComplete`、`isPartial`、`expanded`、`showImages`、`isError`

使用 `context.state` 存储 cross-slot 共享状态。当你想在多次渲染中重用和修改同一个组件时，将 slot-local 缓存保存在返回的组件实例上。

#### renderCall

渲染工具调用或标题：

```typescript
import { Text } from "@earendil-works/pi-tui";

renderCall(args, theme, context) {
  const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
  let content = theme.fg("toolTitle", theme.bold("my_tool "));
  content += theme.fg("muted", args.action);
  if (args.text) {
    content += " " + theme.fg("dim", `"${args.text}"`);
  }
  text.setText(content);
  return text;
}
```

#### renderResult

渲染工具结果或输出：

```typescript
renderResult(result, { expanded, isPartial }, theme, context) {
  if (isPartial) {
    return new Text(theme.fg("warning", "Processing..."), 0, 0);
  }

  if (result.details?.error) {
    return new Text(theme.fg("error", `Error: ${result.details.error}`), 0, 0);
  }

  let text = theme.fg("success", "✓ Done");
  if (expanded && result.details?.items) {
    for (const item of result.details.items) {
      text += "\n  " + theme.fg("dim", item);
    }
  }
  return new Text(text, 0, 0);
}
```

如果插槽有意不包含可见内容，则返回一个空的 `Component`，例如空的 `Container`。

#### 快捷键提示｜ Keybinding Hints

使用 `keyHint()` 显示遵循当前快捷键配置的快捷键提示：

```typescript
import { keyHint } from "@earendil-works/pi-coding-agent";

renderResult(result, { expanded }, theme, context) {
  let text = theme.fg("success", "✓ Done");
  if (!expanded) {
    text += ` (${keyHint("app.tools.expand", "to expand")})`;
  }
  return new Text(text, 0, 0);
}
```

可用函数：
- `keyHint(keybinding, description)` - 格式化已配置的快捷键 ID ，例如 `"app.tools.expand"` 或 `"tui.select.confirm"`
- `keyText(keybinding)` - 返回快捷键 ID 的原始配置键文本
- `rawKeyHint(key, description)` - 格式化原始键字符串

使用带命名空间的快捷键 ID ：
- 编程代理 ID 使用 `app.*` 命名空间，例如 `app.tools.expand`、`app.editor.external`、`app.session.rename`
- 共享的 TUI ID 使用 `tui.*` 命名空间，例如 `tui.select.confirm`、`tui.select.cancel`、`tui.input.tab`

有关快捷键 ID 及其默认值的完整列表，请参阅 [keybindings.md](keybindings.md)。`keybindings.json` 使用这些相同的命名空间 ID。

自定义编辑器和 `ctx.ui.custom()` 组件会接收 `keybindings: KeybindingsManager` 作为注入参数。它们应直接使用注入的管理器，而不是调用 `getKeybindings()` 或 `setKeybindings()`。

#### 最佳实践｜ Best Practices

- 使用带内边距 `(0, 0)` 的 `Text`。默认的 Box 会处理内边距。
- 为 multi-line 内容使用 `\n`。
- 处理 `isPartial` 以实现流式进度。
- 支持 `expanded` 以按需获取详细信息。
- 保持默认视图紧凑。
- 在 `renderResult` 中读取 `context.args`，而不是将参数复制到 `context.state` 中。
- 仅对必须在调用和结果插槽之间共享的数据使用 `context.state`。
- 当同一组件实例可以原地更新时，复用 `context.lastComponent`。
- 仅在默认的盒状外壳妨碍时使用 `renderShell: "self"`。在 self-shell 模式下，工具负责自身的框架、内边距和背景。

#### 回退｜ Fallback

如果插槽渲染器未定义或抛出异常：
- `renderCall`：显示工具名称
- `renderResult`：显示来自 `content` 的原始文本

### 动态工具加载｜ Dynamic Tool Loading

扩展可以注册许多工具，同时只保持一个较小的初始激活集。工具在执行期间可以通过 `pi.setActiveTools()` 添加更多工具。Pi 检测纯增量变化，在该工具结果上记录新可用的工具名称，并在下一个模型请求前应用更新后的激活集。

这适用于所有模型。支持原生 deferred-loading 的模型保留稳定的提示前缀，并在 tool-result 位置加载新定义。其他模型使用下文描述的回退方案。

生命周期如下：

1. 使用 `pi.registerTool()` 注册每个工具，使其出现在 `pi.getAllTools()` 中。
2. 保持加载器工具（如 `search_tools`）处于激活状态，而让可搜索工具保持非激活状态。
3. 在加载器执行期间，调用 `pi.setActiveTools([...currentTools, ...matchingTools])`。该更改必须是增量的：不要在同一调用中移除当前激活的工具。
4. Pi 记录在加载器工具结果上添加的工具。
5. 在下一次模型响应之前，Pi 使用原生延迟加载（如果支持）或正常的激活工具列表来暴露新添加的定义。

你不需要返回 provider-specific 工具引用或将加载器标记为特殊的搜索工具。active-tool 变化是信号。传递给 `pi.setActiveTools()` 的名称必须已经注册；未知名称会被忽略。

#### 支持原生延迟加载的模型｜ Models with native deferred loading

- **Anthropic**
  - **模型：** Sonnet、Opus、Fable 4.5 或更新版本 (不含 Haiku)
  - **原生表示：** 延迟定义使用 `defer_loading`；加载点使用 `tool_reference` 内容。
- **OpenAI**
  - **模型：** `gpt-5.4` 及更新家族
  - **原生表示：** Pi 在加载点添加已完成的客户端 `tool_search_call` 和 `tool_search_output` 项。

对于已验证的自定义模型或代理，可以通过为 `anthropic-messages` 设置 `compat.supportsToolReferences: true`，或为 `openai-responses` 和 `openai-codex-responses` 设置 `compat.supportsToolSearch: true` 来启用原生处理。除非端点与模型接受相应的原生协议，否则请保持这些设置禁用。

#### 回退行为｜ Fallback behavior

对于所有其他模型和模型提供商，动态激活仍然有效：Pi 会在下一次请求中正常发送完整的当前活动工具列表。模型可以调用新激活的工具，但添加其定义可能会使提供商缓存的提示词前缀失效。

当活动集不是纯粹新增（例如将一组工具替换为另一组）时，Pi 也会使用此安全回退。因此，移除工具是可行的，但不使用延迟加载。

为了获得最佳缓存行为，请在整个会话期间保持加载器工具处于活动状态，并添加工具而不是替换活动集。另请注意，使用 `promptSnippet` 或 `promptGuidelines` 激活工具会重建系统提示词；即使提供商支持延迟定义，system-prompt 变化也可能使前缀失效。延迟加载的工具通常应依赖其工具 `description`，并省略 active-only 提示词元数据。

#### 搜索工具示例｜ Search tool example

以下扩展注册了两个可搜索工具，将它们从初始活动集中移除，并且只保留 `search_tools` 作为它们的加载器。该示例使用简单的关键词匹配，但搜索实现可以使用 BM25、嵌入向量、远程目录或 project-specific 路由。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const SEARCHABLE_TOOL_NAMES = new Set(["lookup_weather", "search_issues"]);

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "lookup_weather",
    label: "Lookup Weather",
    description: "Look up the current weather for a city",
    parameters: Type.Object({ city: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: `Weather for ${params.city}: sunny` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "search_issues",
    label: "Search Issues",
    description: "Search project issues by keyword",
    parameters: Type.Object({ query: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: `No open issues matching ${params.query}` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "search_tools",
    label: "Search Tools",
    description: "Search for and enable tools relevant to a task",
    promptSnippet: "Search for additional tools when the active tools cannot perform the task",
    promptGuidelines: [
      "Use search_tools when a task requires a capability that is not currently available.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Capability or task to search for" }),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })),
    }),
    async execute(_toolCallId, params) {
      const terms = params.query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const matches = pi.getAllTools()
        .filter((tool) => SEARCHABLE_TOOL_NAMES.has(tool.name))
        .map((tool) => ({
          tool,
          score: terms.reduce(
            (score, term) =>
              score + (`${tool.name} ${tool.description}`.toLowerCase().includes(term) ? 1 : 0),
            0,
          ),
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit ?? 3)
        .map((match) => match.tool.name);

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: `No tools found for: ${params.query}` }],
          details: { matches: [] },
        };
      }

      const active = pi.getActiveTools();
      const added = matches.filter((name) => !active.includes(name));
      pi.setActiveTools([...new Set([...active, ...added])]);

      return {
        content: [{
          type: "text",
          text: added.length > 0
            ? `Loaded tools: ${added.join(", ")}`
            : `Matching tools already active: ${matches.join(", ")}`,
        }],
        details: { matches, added },
      };
    },
  });

  pi.on("session_start", () => {
    // Keep searchable tools registered but initially inactive. Preserve built-ins
    // and tools owned by other extensions, and keep the loader itself active.
    const initialTools = pi.getActiveTools().filter(
      (name) => !SEARCHABLE_TOOL_NAMES.has(name),
    );
    pi.setActiveTools([...new Set([...initialTools, "search_tools"])]);
  });
}
```

当 `search_tools` 添加匹配项时，模型会在紧接着的下一次请求中收到该定义。在 native-capable 模型上，该定义会锚定在搜索结果之后，而不改变初始的 tool-schema 前缀。在其他模型上，它会在同样的下一次请求中出现在正常工具列表中。

## 自定义 UI ｜ Custom UI

扩展可以通过 `ctx.ui` 方法与用户交互，并自定义消息/工具的渲染方式。

**对于自定义组件，请参见 [tui.md](tui.md)**，其中包含 copy-paste 模式，用于：
- 选择对话框 (SelectList)
- 带取消的异步操作 (BorderedLoader)
- 设置开关 (SettingsList)
- 状态指示器 (setStatus)
- 流式传输期间的工作消息、可见性和指示器 (`setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`)
- 编辑器上方/下方的小部件 (setWidget)
- 基于 built-in 斜杠/路径补全的自动完成提供程序 (addAutocompleteProvider)
- 自定义页脚 (setFooter)

### 对话框｜ Dialogs

```typescript
// Select from options
const choice = await ctx.ui.select("Pick one:", ["A", "B", "C"]);

// Confirm dialog
const ok = await ctx.ui.confirm("Delete?", "This cannot be undone");

// Text input
const name = await ctx.ui.input("Name:", "placeholder");

// Multi-line editor
const text = await ctx.ui.editor("Edit:", "prefilled text");

// Notification (non-blocking)
ctx.ui.notify("Done!", "info");  // "info" | "warning" | "error"
```

#### 带倒计时的定时对话框｜ Timed Dialogs with Countdown

对话框支持 `timeout` 选项，该选项 auto-dismisses 带有实时倒计时显示：

```typescript
// Dialog shows "Title (5s)" → "Title (4s)" → ... → auto-dismisses at 0
const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { timeout: 5000 }
);

if (confirmed) {
  // User confirmed
} else {
  // User cancelled or timed out
}
```

**超时时的返回值：**
- `select()` 返回 `undefined`
- `confirm()` 返回 `false`
- `input()` 返回 `undefined`

#### 使用 AbortSignal 手动关闭｜ Manual Dismissal with AbortSignal

为了更精细的控制(e.g，例如区分超时和用户取消)，请使用 `AbortSignal`：

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { signal: controller.signal }
);

clearTimeout(timeoutId);

if (confirmed) {
  // User confirmed
} else if (controller.signal.aborted) {
  // Dialog timed out
} else {
  // User cancelled (pressed Escape or selected "No")
}
```

请参阅 [examples/extensions/timed-confirm.ts](/examples/extensions/timed-confirm.ts) 获取完整示例。

### 小组件、状态和页脚｜ Widgets, Status, and Footer

```typescript
// Status in footer (persistent until cleared)
ctx.ui.setStatus("my-ext", "Processing...");
ctx.ui.setStatus("my-ext", undefined);  // Clear

// Working loader (shown during streaming)
ctx.ui.setWorkingMessage("Thinking deeply...");
ctx.ui.setWorkingMessage();  // Restore default
ctx.ui.setWorkingVisible(false);  // Hide the built-in working loader row entirely
ctx.ui.setWorkingVisible(true);   // Show the built-in working loader row

// Working indicator (shown during streaming)
ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg("accent", "●")] });  // Static dot
ctx.ui.setWorkingIndicator({
  frames: [
    ctx.ui.theme.fg("dim", "·"),
    ctx.ui.theme.fg("muted", "•"),
    ctx.ui.theme.fg("accent", "●"),
    ctx.ui.theme.fg("muted", "•"),
  ],
  intervalMs: 120,
});
ctx.ui.setWorkingIndicator({ frames: [] });  // Hide indicator
ctx.ui.setWorkingIndicator();  // Restore default spinner

// Widget above editor (default)
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"]);
// Widget below editor
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"], { placement: "belowEditor" });
ctx.ui.setWidget("my-widget", (tui, theme) => new Text(theme.fg("accent", "Custom"), 0, 0));
ctx.ui.setWidget("my-widget", undefined);  // Clear

// Custom footer (replaces built-in footer entirely)
ctx.ui.setFooter((tui, theme) => ({
  render(width) { return [theme.fg("dim", "Custom footer")]; },
  invalidate() {},
}));
ctx.ui.setFooter(undefined);  // Restore built-in footer

// Terminal title
ctx.ui.setTitle("pi - my-project");

// Editor text
ctx.ui.setEditorText("Prefill text");
const current = ctx.ui.getEditorText();

// Paste into editor (triggers paste handling, including collapse for large content)
ctx.ui.pasteToEditor("pasted content");

// Stack custom autocomplete behavior on top of the built-in provider
ctx.ui.addAutocompleteProvider((current) => ({
  triggerCharacters: ["#"],
  async getSuggestions(lines, line, col, options) {
    const beforeCursor = (lines[line] ?? "").slice(0, col);
    const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
    if (!match) {
      return current.getSuggestions(lines, line, col, options);
    }

    return {
      prefix: `#${match[1] ?? ""}`,
      items: [{ value: "#2983", label: "#2983", description: "Extension API for autocomplete" }],
    };
  },
  applyCompletion(lines, line, col, item, prefix) {
    return current.applyCompletion(lines, line, col, item, prefix);
  },
  shouldTriggerFileCompletion(lines, line, col) {
    return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
  },
}));

// Tool output expansion
const wasExpanded = ctx.ui.getToolsExpanded();
ctx.ui.setToolsExpanded(true);
ctx.ui.setToolsExpanded(wasExpanded);

// Custom editor (vim mode, emacs mode, etc.)
ctx.ui.setEditorComponent((tui, theme, keybindings) => new VimEditor(tui, theme, keybindings));
const currentEditor = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent((tui, theme, keybindings) =>
  new WrappedEditor(tui, theme, keybindings, currentEditor?.(tui, theme, keybindings))
);
ctx.ui.setEditorComponent(undefined);  // Restore default editor

// Theme management (see themes.md for creating themes)
const themes = ctx.ui.getAllThemes();  // [{ name: "dark", path: "/..." | undefined }, ...]
const lightTheme = ctx.ui.getTheme("light");  // Load without switching
const result = ctx.ui.setTheme("light");  // Switch by name
if (!result.success) {
  ctx.ui.notify(`Failed: ${result.error}`, "error");
}
ctx.ui.setTheme(lightTheme!);  // Or switch by Theme object
ctx.ui.theme.fg("accent", "styled text");  // Access current theme
```

自定义 working-indicator 帧会原样渲染。如果你想要颜色，请自行添加到帧字符串中，例如使用 `ctx.ui.theme.fg(...)`。

### 自动补全提供者｜ Autocomplete Providers

使用 `ctx.ui.addAutocompleteProvider()` 在 built-in slash-command 和路径提供者之上叠加自定义自动补全逻辑。设置 `triggerCharacters` 以自定义自然触发条件，例如 `使用 `ctx.ui.addAutocompleteProvider()` 在 built-in slash-command 和路径提供者之上叠加自定义自动补全逻辑。设置 `triggerCharacters` 以自定义自然触发条件，例如 。

典型模式：

- 检查光标前的文本
- 当你的 extension-specific 语法匹配时返回你自己的建议
- 否则委托给 `current.getSuggestions(...)`
- 除非你需要自定义插入行为，否则委托 `applyCompletion(...)`

```typescript
pi.on("session_start", (_event, ctx) => {
  ctx.ui.addAutocompleteProvider((current) => ({
    triggerCharacters: ["#"],
    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const line = lines[cursorLine] ?? "";
      const beforeCursor = line.slice(0, cursorCol);
      const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
      if (!match) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      return {
        prefix: `#${match[1] ?? ""}`,
        items: [
          { value: "#2983", label: "#2983", description: "Extension API for registering custom @ autocomplete providers" },
          { value: "#2753", label: "#2753", description: "Reload stale resource settings" },
        ],
      };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
    },
  }));
});
```

请参阅 [github-issue-autocomplete.ts](/examples/extensions/github-issue-autocomplete.ts) 获取完整示例，该示例预加载最新的 GitHub 问题列表（使用 `gh issue list`），并在本地过滤以实现快速 `#...` 自动补全。它需要 GitHub CLI (`gh`) 和 GitHub 仓库检出。

### 自定义组件｜ Custom Components

对于复杂的 UI ，使用 `ctx.ui.custom()`。这会临时将编辑器替换为你的组件，直到调用 `done()`：

```typescript
import { Text, Component } from "@earendil-works/pi-tui";

const result = await ctx.ui.custom<boolean>((tui, theme, keybindings, done) => {
  const text = new Text("Press Enter to confirm, Escape to cancel", 1, 1);

  text.onKey = (key) => {
    if (key === "return") done(true);
    if (key === "escape") done(false);
    return true;
  };

  return text;
});

if (result) {
  // User pressed Enter
}
```

回调函数接收：
- `tui` - TUI 实例 (用于屏幕尺寸、焦点管理)
- `theme` - 当前主题，用于样式
- `keybindings` - 应用快捷键管理器 (用于检查快捷键)
- `done(value)` - 调用以关闭组件并返回值

参见 [tui.md](tui.md) 以获取完整组件 API。

#### 覆盖模式（实验性）｜ Overlay Mode (Experimental)

传递 `{ overlay: true }` 将组件渲染为悬浮在现有内容之上的浮动模态框，不清理屏幕：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  { overlay: true }
);
```

对于高级定位 (锚点、边距、百分比、响应式可见性)，传递 `overlayOptions`。使用 `onHandle` 以编程方式控制焦点或可见性：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  {
    overlay: true,
    overlayOptions: { anchor: "top-right", width: "50%", margin: 2 },
    onHandle: (handle) => {
      handle.focus(); // focus this overlay and bring it to the visual front
      // handle.unfocus({ target: editorComponent }); // release input to a specific component
      // handle.setHidden(true/false); // toggle visibility
      // handle.hide(); // permanently remove
    }
  }
);
```

聚焦的可见覆盖层可以在临时 non-overlay 自定义 UI 关闭后重新获得输入。如果你有意让另一个组件在覆盖层保持可见时继续获取输入，调用 `handle.unfocus({ target })`。传递 `{ target: null }` 可释放覆盖层而不聚焦另一个组件。

参见 [tui.md](tui.md) 以获取完整的 `OverlayOptions` 和 `OverlayHandle` API 以及 [overlay-qa-tests.ts](../examples/extensions/overlay-qa-tests.ts) 中的示例。

### 自定义编辑器｜ Custom Editor

用自定义实现替换主输入编辑器 (vim 模式、emacs 模式等)：

```typescript
import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

class VimEditor extends CustomEditor {
  private mode: "normal" | "insert" = "insert";

  handleInput(data: string): void {
    if (matchesKey(data, "escape") && this.mode === "insert") {
      this.mode = "normal";
      return;
    }
    if (this.mode === "normal" && data === "i") {
      this.mode = "insert";
      return;
    }
    super.handleInput(data);  // App keybindings + text editing
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) =>
      new VimEditor(tui, theme, keybindings)
    );
  });
}
```

**关键点：**
- 扩展 `CustomEditor` (非基础 `Editor`) 以获取应用快捷键 (escape 中止、ctrl+d、模型切换)
- 对于未处理的按键，调用 `super.handleInput(data)`
- 工厂从应用接收 `tui`、`theme` 和 `keybindings`
- 在 `setEditorComponent()` 之前使用 `ctx.ui.getEditorComponent()` 包装先前配置的自定义编辑器
- 传递 `undefined` 以恢复默认值：`ctx.ui.setEditorComponent(undefined)`

要与已经替换编辑器的另一个扩展组合，请在设置你的工厂之前捕获之前的工厂：

```typescript
const previous = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent((tui, theme, keybindings) =>
  new MyEditor(tui, theme, keybindings, { base: previous?.(tui, theme, keybindings) })
);
```

参见 [tui.md](tui.md) 模式 7 以获取带有模式指示器的完整示例。

### 消息与条目渲染｜ Message and Entry Rendering

为消息注册自定义渲染器，使用你的 `customType`。对应参与 LLM 上下文的内容使用消息渲染器：

```typescript
import { Text } from "@earendil-works/pi-tui";

pi.registerMessageRenderer("my-extension", (message, options, theme) => {
  const { expanded } = options;
  let text = theme.fg("accent", `[${message.customType}] `);
  text += message.content;

  if (expanded && message.details) {
    text += "\n" + theme.fg("dim", JSON.stringify(message.details, null, 2));
  }

  return new Text(text, 0, 0);
});
```

消息通过 `pi.sendMessage()` 发送：

```typescript
pi.sendMessage({
  customType: "my-extension",  // Matches registerMessageRenderer
  content: "Status update",
  display: true,               // Show in TUI
  details: { ... },            // Available in renderer
});
```

对于不应发送给 LLM 的仅 TUI 内容，改为渲染自定义条目：

```typescript
pi.registerEntryRenderer("my-card", (entry, options, theme) => {
  return new Text(theme.fg("accent", JSON.stringify(entry.data)));
});

pi.appendEntry("my-card", { status: "done" });
```

### 主题颜色｜ Theme Colors

所有渲染函数接收一个 `theme` 对象。参见 [themes.md](themes.md) 以创建自定义主题和完整调色板。

```typescript
// Foreground colors
theme.fg("toolTitle", text)   // Tool names
theme.fg("accent", text)      // Highlights
theme.fg("success", text)     // Success (green)
theme.fg("error", text)       // Errors (red)
theme.fg("warning", text)     // Warnings (yellow)
theme.fg("muted", text)       // Secondary text
theme.fg("dim", text)         // Tertiary text

// Text styles
theme.bold(text)
theme.italic(text)
theme.strikethrough(text)
```

用于自定义工具渲染器中的语法高亮：

```typescript
import { highlightCode, getLanguageFromPath } from "@earendil-works/pi-coding-agent";

// Highlight code with explicit language
const highlighted = highlightCode("const x = 1;", "typescript", theme);

// Auto-detect language from file path
const lang = getLanguageFromPath("/path/to/file.rs");  // "rust"
const highlighted = highlightCode(code, lang, theme);
```

## 错误处理｜ Error Handling

- 扩展错误被记录，代理继续执行
- `tool_call` 错误会阻塞工具 (fail-safe)
- 工具 `execute` 错误必须通过抛出异常来指示；抛出的错误被捕获，通过 `isError: true` 报告给 LLM，并且执行继续

## 模式行为｜ Mode Behavior

| 模式｜ Mode | `ctx.mode` | `ctx.hasUI` | 备注｜ Notes |
|------|------------|-------------|-------|
| 交互式｜ Interactive | `"tui"` | `true` | 完整的TUI与终端渲染 |
| RPC (`--mode rpc`) | `"rpc"` | `true` | 通过JSON协议的对话框和通知；`custom()`返回`undefined`。参见[rpc.md](rpc.md) |
| JSON (`--mode json`) | `"json"` | `false` | 事件流输出到 stdout ； UI 方法为no-ops |
| 打印(`-p`) | `"print"` | `false` | 扩展可以运行但不能提示 |

在 TUI 特定功能 (`custom()`、组件工厂、终端输入) 之前使用 `ctx.mode === "tui"`。在 TUI 和 RPC 模式下都有效的对话框和通知方法之前使用 `ctx.hasUI`。

## 示例参考

所有示例位于 [examples/extensions/](../examples/extensions/)。

| 示例 | 描述 | 关键 API |
|---------|-------------|----------|
| **工具** |||
| `hello.ts` | 最小工具注册 | `registerTool` |
| `question.ts` | 带用户交互的工具 | `registerTool`, `ui.select` |
| `questionnaire.ts` | 多步骤向导工具 | `registerTool`, `ui.custom` |
| `todo.ts` | 带持久化的有状态工具 | `registerTool`, `appendEntry`, `renderResult`, 会话事件 |
| `dynamic-tools.ts` | 在启动后和命令期间注册工具 | `registerTool`, `session_start`, `registerCommand` |
| `structured-output.ts` | 最终的structured-output工具使用`terminate: true` | `registerTool`，终止工具结果 |
| `truncated-tool.ts` | 输出截断示例 | `registerTool`, `truncateHead` |
| `tool-override.ts` | 覆盖built-in读取工具 | `registerTool` (与built-in同名) |
| **命令** |||
| `pirate.ts` | 修改系统提示词per-turn | `registerCommand`, `before_agent_start` |
| `summarize.ts` | 对话摘要命令 | `registerCommand`, `ui.custom` |
| `handoff.ts` | 跨模型提供商模型切换 | `registerCommand`, `ui.editor`, `ui.custom` |
| `qna.ts` | 带自定义 UI 的问答｜ Q&A with custom UI | `registerCommand`, `ui.custom`, `setEditorText` |
| `send-user-message.ts` | 注入用户消息｜ Inject user messages | `registerCommand`, `sendUserMessage` |
| `reload-runtime.ts` | 重载命令和 LLM 工具交接 | `registerCommand`, `ctx.reload()`, `sendUserMessage` |
| `shutdown-command.ts` | 优雅关闭命令｜ Graceful shutdown command | `registerCommand`, `shutdown()` |
| **事件与门控** |||
| `permission-gate.ts` | 阻止危险命令｜ Block dangerous commands | `on("tool_call")`, `ui.confirm` |
| `project-trust.ts` | 从用户/全局或 CLI 扩展决定或延迟项目信任 | `on("project_trust")`, 信任 UI, 必需的信任结果 |
| `protected-paths.ts` | 阻止写入特定路径｜ Block writes to specific paths | `on("tool_call")` |
| `confirm-destructive.ts` | 确认会话变更 | `on("session_before_switch")`, `on("session_before_fork")` |
| `dirty-repo-guard.ts` | 在脏状态时警告 git repo | `on("session_before_*")`, `exec` |
| `input-transform.ts` | 转换用户输入 | `on("input")` |
| `input-transform-streaming.ts` | 支持流式传输的输入转换 | `on("input")`, `streamingBehavior` |
| `model-status.ts` | 响应模型变更 | `on("model_select")`, `setStatus` |
| `provider-payload.ts` | 检查载荷和模型提供商响应头 | `on("before_provider_request")`, `on("after_provider_response")` |
| `system-prompt-header.ts` | 显示系统提示词信息 | `on("agent_start")`, `getSystemPrompt` |
| `claude-rules.ts` | 从文件加载规则 | `on("session_start")`, `on("before_agent_start")` |
| `prompt-customizer.ts` | 使用`systemPromptOptions`添加context-aware工具指导 | `on("before_agent_start")`, `BuildSystemPromptOptions` |
| `file-trigger.ts` | 文件监视器触发消息 | `sendMessage` |
| **上下文压缩与会话｜上下文压缩 & Sessions** |||
| `custom-compaction.ts` | 自定义上下文压缩摘要 | `on("session_before_compact")` |
| `trigger-compact.ts` | 手动触发上下文压缩 | `compact()` |
| `git-checkpoint.ts` | 在轮次时暂存 Git 更改 | `on("turn_start")`, `on("session_before_fork")`, `exec` |
| `git-merge-and-resolve.ts` | 获取、合并并解决冲突 | `on("agent_end")`, `exec`, `sendUserMessage` |
| `auto-commit-on-exit.ts` | 关闭时提交 | `on("session_shutdown")`, `exec` |
| **UI 组件｜ UI Components** |||
| `status-line.ts` | 页脚状态指示器 | `setStatus`, 会话事件 |
| `working-indicator.ts` | 自定义流式工作指示器 | `setWorkingIndicator`, `registerCommand` |
| `github-issue-autocomplete.ts` | 在 built-in 自动补全之上添加 `#1234` 问题补全，通过预加载来自 `gh issue list` 的最近打开的问题 | `addAutocompleteProvider`, `on("session_start")`, `exec` |
| `custom-footer.ts` | 完全替换页脚 | `registerCommand`, `setFooter` |
| `custom-header.ts` | 替换启动头部 | `on("session_start")`, `setHeader` |
| `modal-editor.ts` | Vim 风格模式编辑器 | `setEditorComponent`, `CustomEditor` |
| `rainbow-editor.ts` | 自定义编辑器样式 | `setEditorComponent` |
| `widget-placement.ts` | 编辑器上方/下方的微件 | `setWidget` |
| `overlay-test.ts` | 覆盖层组件 | `ui.custom` 及覆盖层选项 |
| `overlay-qa-tests.ts` | 全面覆盖层测试 | `ui.custom`，所有覆盖层选项 |
| `notify.ts` | 简单通知 | `ui.notify` |
| `timed-confirm.ts` | 带超时的对话框 | `ui.confirm` 带超时/信号 |
| `mac-system-theme.ts` | 自动切换主题 | `setTheme`, `exec` |
| **复杂扩展** |||
| `plan-mode/` | 完整计划模式实现 | 所有事件类型，`registerCommand`、`registerShortcut`、`registerFlag`、`setStatus`、`setWidget`、`sendMessage`、`setActiveTools` |
| `preset.ts` | 可保存的预设 (模型、工具、思考) | `registerCommand`, `registerShortcut`, `registerFlag`, `setModel`, `setActiveTools`, `setThinkingLevel`, `appendEntry` |
| `tools.ts` | 切换工具启用/禁用界面 | `registerCommand`, `setActiveTools`, `SettingsList`, 会话事件 |
| **远程与沙盒** |||
| `ssh.ts` | SSH 远程执行 | `registerFlag`, `on("user_bash")`, `on("before_agent_start")`, 工具操作 |
| `interactive-shell.ts` | 持久化 Shell 会话 | `on("user_bash")` |
| `sandbox/` | 沙盒化工具执行 | 工具操作 |
| `gondolin/` | 将 built-in 工具和 `!` 命令路由到 Gondolin 微虚拟机 | 工具操作，built-in 工具覆盖，`on("user_bash")` |
| `subagent/` | 生成 sub-agents | `registerTool`, `exec` |
| **游戏** |||
| `snake.ts` | 贪吃蛇游戏 | `registerCommand`、`ui.custom`、键盘处理 |
| `space-invaders.ts` | 太空入侵者游戏 | `registerCommand`、`ui.custom` |
| `doom-overlay/` | 在叠加层中运行《毁灭战士》 | `ui.custom` 使用叠加层 |
| **模型提供商｜ Providers** |||
| `custom-provider-anthropic/` | 自定义 Anthropic 代理 | `registerProvider` |
| `custom-provider-gitlab-duo/` | GitLab Duo 集成 | `registerProvider` 使用 OAuth |
| **消息与通信｜ Messages & Communication** |||
| `message-renderer.ts` | 自定义消息渲染 | `registerMessageRenderer`, `sendMessage` |
| `entry-renderer.ts` | 仅TUI的自定义条目渲染 | `registerEntryRenderer`, `appendEntry` |
| `event-bus.ts` | 扩展间事件 | `pi.events` |
| **会话元数据** |||
| `session-name.ts` | 为选择器命名会话 | `setSessionName`, `getSessionName` |
| `bookmark.ts` | 为/tree添加书签条目 | `setLabel` |
| **杂项** |||
| `inline-bash.ts` | 工具调用中的内联 bash | `on("tool_call")` |
| `bash-spawn-hook.ts` | 在执行前调整 bash 命令、工作目录和环境变量 | `createBashTool`, `spawnHook` |
| `with-deps/` | 使用 npm dependencies 的扩展 | 使用 `package.json` 的包结构 |
