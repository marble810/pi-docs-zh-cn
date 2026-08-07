# 自定义模型｜ Custom Models

通过 `~/.pi/agent/models.json` 添加自定义模型提供商和模型(Ollama、vLLM、LM Studio、代理)。

## 目录｜ Table of Contents

- [最小示例](#minimal-example)
- [完整示例](#full-example)
- [支持的 API](#supported-apis)
- [模型提供商配置](#provider-configuration)
- [模型配置](#model-configuration)
- [覆盖内置模型提供商｜ Overriding Built-in Providers](#overriding-built-in-providers)
- [按模型覆盖｜ Per-model Overrides](#per-model-overrides)
- [Anthropic Messages 兼容性｜ Anthropic Messages Compatibility](#anthropic-messages-compatibility)
- [OpenAI 兼容性｜ Compatibility](#openai-compatibility)

## 最小示例

对于本地模型 (Ollama、LM Studio、vLLM)，每个模型只需 `id`：

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

`apiKey` 值是一个占位符，因为 Ollama 会忽略它。pi 仍会将模型视为需要认证，然后它们才会出现在 `/model` 中，因此无密钥的本地服务器应保留一个虚拟值，使用 `/login` 为该提供商保存密钥，或在选择模型时传递 `--api-key`。

某些 OpenAI 兼容服务器不理解用于 reasoning-capable 模型的 `developer` 角色。对于这些提供商，将 `compat.supportsDeveloperRole` 设置为 `false`，以便 pi 将系统提示词作为 `system` 消息发送。如果服务器也不支持 `reasoning_effort`，请同时将 `compat.supportsReasoningEffort` 设置为 `false`。

您可以在提供商级别设置 `compat` 以应用于所有模型，或在模型级别设置以覆盖特定模型。这通常适用于 Ollama、vLLM、SGLang 以及类似的 OpenAI 兼容服务器。

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        {
          "id": "gpt-oss:20b",
          "reasoning": true
        }
      ]
    }
  }
}
```

## 完整示例

当您需要特定值时覆盖默认设置：

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        {
          "id": "llama3.1:8b",
          "name": "Llama 3.1 8B (Local)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 128000,
          "maxTokens": 32000,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

每次打开 `/model` 时文件都会重新加载。在会话期间编辑；无需重启。

## Google AI Studio 示例

使用 `google-generative-ai` 和 `baseUrl` 从 Google AI Studio 添加模型，包括自定义 Gemma 4 条目：

```json
{
  "providers": {
    "my-google": {
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
      "api": "google-generative-ai",
      "apiKey": "$GEMINI_API_KEY",
      "models": [
        {
          "id": "gemma-4-31b-it",
          "name": "Gemma 4 31B",
          "input": ["text", "image"],
          "contextWindow": 262144,
          "reasoning": true
        }
      ]
    }
  }
}
```

向 `google-generative-ai` API 类型添加自定义模型时，`baseUrl` 是必需的。

## 支持的 API

| API | 描述 |
|-----|-------------|
| `openai-completions` | OpenAI Chat Completions (最兼容) |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic Messages API |
| `google-generative-ai` | Google Generative AI |

在提供商级别设置 `api` (默认适用于所有模型)，或在模型级别设置 (按模型覆盖)。

## 提供商配置｜模型提供商 配置

| 字段 | 描述 |
|-------|-------------|
| `baseUrl` | API 端点 URL |
| `api` | API 类型 (见上文) |
| `apiKey` | 可选的 API 密钥配置 (见下方值解析)。当通过 `/login`/`auth.json` 或 CLI `--api-key` 提供认证时，可省略此项。 |
| `oauth` | 动态 OAuth 提供商类型。目前支持 `"radius"`；需要网关 `baseUrl`。 |
| `headers` | 自定义请求头 (见下方值解析) |
| `authHeader` | 设置 `true` 以自动添加 `Authorization: Bearer <apiKey>` |
| `models` | 模型配置数组 |
| `modelOverrides` | 此提供商上 built-in 或 extension-registered 模型的按模型覆盖 |

对于具有 `models` 的提供商，non-built-in 提供商配置需要在提供商或模型级别提供 `baseUrl` 和 `api` 值。加载文件不需要 `apiKey`：当通过 `/login`/`auth.json`、CLI `--api-key` 或提供商 `apiKey` 配置认证时，模型变为可用。如果未配置认证，模型会加载但在 `/model` 和 `--list-models` 中保持不可用。

### 值解析｜ Value Resolution

`apiKey` 和 `headers` 字段支持命令执行、环境变量插值和字面量：

- **Shell 命令：** 开头的 `"!command"` 会将整个值作为命令执行，并使用标准输出
 ```json
  "apiKey": "!security find-generic-password -ws 'anthropic'"
  "apiKey": "!op read 'op://vault/item/credential'"
  ```
- **环境变量插值：** `"$ENV_VAR"` 或 `"${ENV_VAR}"` 使用命名变量的值。插值可在较大的字面量内部工作。
 ```json
  "apiKey": "$MY_API_KEY"
  "apiKey": "${KEY_PREFIX}_${KEY_SUFFIX}"
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR` 是字面文本。缺少环境变量会导致值无法解析。
- **转义：** `"$"` 输出字面量 `"$"`；`"$!"` 输出字面量 `"!"`，而不会触发命令执行。
 ```json
  "apiKey": "$literal-dollar-prefix"
  "apiKey": "$!literal-bang-prefix"
  ```
- **字面量值：** 直接使用。纯大写字符串（如 `MY_API_KEY`）是字面量；对于环境变量请使用 `$MY_API_KEY`。
 ```json
  "apiKey": "sk-..."
  ```

对于 `models.json`， shell 命令在请求时解析。pi 有意不对任意命令应用 built-in TTL、过期复用或恢复逻辑。不同的命令需要不同的缓存和失败策略， pi 无法推断出正确的策略。

如果您的命令速度慢、成本高、rate-limited，或者应在瞬时故障时继续使用先前的值，请将其包装在您自己的脚本或命令中，以实现您想要的缓存或 TTL 行为。

`/model` 可用性检查使用配置的认证存在性，不会执行 shell 命令。

### 自定义请求头｜ Custom Headers

```json
{
  "providers": {
    "custom-proxy": {
      "baseUrl": "https://proxy.example.com/v1",
      "apiKey": "$MY_API_KEY",
      "api": "anthropic-messages",
      "headers": {
        "x-portkey-api-key": "$PORTKEY_API_KEY",
        "x-secret": "!op read 'op://vault/item/secret'"
      },
      "models": [...]
    }
  }
}
```

## 模型配置｜ Model 配置

| 字段 | 必需 | 默认值 | 描述 |
|-------|----------|---------|-------------|
| `id` | 是 | — | 模型标识符 (传递给 API) |
| `name` | 否 | `id` | 人类可读的模型标签。用于匹配 (`--model` 模式)，并作为次要模型详情文本显示。 |
| `api` | 否 | 模型提供商的 `api` | 覆盖此模型的模型提供商的 API |
| `reasoning` | 否 | `false` | 支持扩展思考 |
| `thinkingLevelMap` | 否 | 省略 | 将 pi 思考级别映射到模型提供商的值，并标记不支持的级别 (见下文) |
| `input` | 否 | `["text"]` | 输入类型：`["text"]` 或 `["text", "image"]` |
| `contextWindow` | 否 | `128000` | 上下文窗口大小（以 token 为单位） |
| `maxTokens` | 否 | `16384` | 最大输出 token 数 |
| `samplingParams` | 否 | 省略 | 采样参数逐字合并到每个请求体中 (见下文) |
| `cost` | 否 | 全零 | 按 million-token 的费率，可选 request-wide 输入定价层级 |
| `compat` | 否 | 模型提供商 `compat` | 提供商兼容性覆盖。当两者都设置时，与 provider-level `compat` 合并。 |

成本层级提供一套完整的备选费率，当总输入用量 (`input + cacheRead + cacheWrite`) 超过 `inputTokensAbove` 时，适用于整个请求。当多个层级匹配时，阈值最高的生效。

```json
{
  "cost": {
    "input": 5,
    "output": 30,
    "cacheRead": 0.5,
    "cacheWrite": 6.25,
    "tiers": [
      {
        "inputTokensAbove": 272000,
        "input": 10,
        "output": 45,
        "cacheRead": 1,
        "cacheWrite": 12.5
      }
    ]
  }
}
```

当前行为：
- `/model`、`--list-models` 和交互式页脚按模型 `id` 显示条目。
- 配置的 `name` 用于模型匹配和次要模型详情文本。它不会替换页脚/status-bar 模型 ID。

### 采样参数｜ Sampling Parameters

`samplingParams` 是一个 free-form 对象，逐字合并到该模型的每个请求体中，在 pi 自身设置的字段之后，因此其键优先。使用它发送 pi 未建模的采样参数——包括 server-specific 特有的参数，如 llama.cpp 的 `min_p` 或 vLLM 的 `top_k`：

```json
{
  "id": "deepseek-v4-flash",
  "samplingParams": {
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 0,
    "min_p": 0.0
  }
}
```

仅 OpenAI 兼容的 API 应用它 (`openai-completions`、`openai-responses`、`azure-openai-responses`)；其他 API 忽略它。键覆盖 pi 的命名请求字段 (例如，这里的 `temperature` 键胜过 request-level 温度)，因此优先将其作为模型的唯一 source of 采样真值。在 `modelOverrides` 中，`samplingParams` 按键与基础模型的值合并。

### 思考级别映射｜ Thinking Level Map

在模型上使用 `thinkingLevelMap` 来描述 model-specific 思考控制。键是 pi 思考级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`。映射可以包含空洞；例如，模型可以暴露 `high` 和 `max` 而不暴露 `xhigh`。

值为三态：

| 值 | 含义 |
|-------|---------|
| 省略 | 标准级别到 `high` 使用提供商的默认映射；扩展的 `xhigh` 和 `max` 级别不受支持 |
| 字符串 | 级别受支持，且该值会发送给模型提供商 |
| `null` | 级别不受支持，且会被隐藏/跳过/截断 |

示例：某个模型仅支持关闭、高和最大推理级别：

```json
{
  "id": "deepseek-v4-pro",
  "reasoning": true,
  "thinkingLevelMap": {
    "minimal": null,
    "low": null,
    "medium": null,
    "high": "high",
    "xhigh": null,
    "max": "max"
  }
}
```

示例：某个模型无法禁用思考功能：

```json
{
  "id": "always-thinking-model",
  "reasoning": true,
  "thinkingLevelMap": {
    "off": null
  }
}
```

迁移：旧配置中使用的 `compat.reasoningEffortMap` 应将该映射移至 model-level `thinkingLevelMap`。对于不应出现在界面中的级别，请使用 `null`。

## 覆盖内置模型提供商｜ Overriding Built-in Providers

通过代理路由 built-in 提供商，而无需重新定义模型：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

所有 built-in Anthropic 模型仍然可用。现有的 OAuth 或 API 密钥认证继续有效。

要将自定义模型合并到 built-in 提供商中，请包含 `models` 数组：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1",
      "apiKey": "$ANTHROPIC_API_KEY",
      "api": "anthropic-messages",
      "models": [...]
    }
  }
}
```

合并语义：
- 内置模型会被保留。
- 自定义模型会按 `id` 在提供商内进行更新或插入。
- 如果自定义模型 `id` 与 built-in 模型的 `id` 匹配，则自定义模型会替换该 built-in 模型。
- 如果自定义模型 `id` 是新的，则会与 built-in 模型一起添加。

## 按模型覆盖｜ Per-model Overrides

使用 `modelOverrides` 自定义 built-in 模型和匹配的 extension-registered 模型，而无需替换提供商的完整模型列表。

```json
{
  "providers": {
    "openrouter": {
      "modelOverrides": {
        "anthropic/claude-sonnet-4": {
          "name": "Claude Sonnet 4 (Bedrock Route)",
          "compat": {
            "openRouterRouting": {
              "only": ["amazon-bedrock"]
            }
          }
        }
      }
    }
  }
}
```

`modelOverrides` 支持每个模型以下字段：`name`、`reasoning`、`thinkingLevelMap`、`input`、`cost` (部分)、`contextWindow`、`maxTokens`、`samplingParams` (按键合并)、`headers`、`compat`。

直接 OpenAI GPT-5.6 Sol、Terra 和 Luna 默认使用 `272000` 上下文窗口，以确保请求保持在 OpenAI 的 short-context 定价层级内。要选择使用 OpenAI 的 1.05M 上下文窗口，请为您使用的每个模型增加该值：

```json
{
  "providers": {
    "openai": {
      "modelOverrides": {
        "gpt-5.6-sol": {
          "contextWindow": 1050000
        }
      }
    }
  }
}
```

该覆盖会保留 built-in 定价元数据。总输入令牌超过 272K 的请求将对整个请求使用 GPT-5.6 的 long-context 费率。需要时，请对 `gpt-5.6-terra` 或 `gpt-5.6-luna` 应用相同的覆盖。

行为说明：
- `modelOverrides` 应用于 built-in 提供商模型和匹配的 extension-registered 提供商模型。
- 未知的模型 ID 会被忽略。
- 您可以将 provider-level `baseUrl`/`headers` 与 `modelOverrides` 结合使用。
- 覆盖 `name` 仅会更改模型匹配和次要详细信息文本；页脚和主要模型列表仍会显示模型 `id`。
- 如果还为某个模型提供商定义了 `models`，则自定义模型会在 built-in 覆盖之后合并。具有相同 `id` 的自定义模型会替换被覆盖的 built-in 模型条目。

## Anthropic Messages 兼容性｜ Anthropic Messages Compatibility

对于使用 `api: "anthropic-messages"` 的模型提供商或代理，请使用 `compat` 来控制 Anthropic 特定的请求兼容性。

默认情况下， pi 会发送 per-tool `eager_input_streaming: true`。如果代理或兼容 Anthropic 的后端拒绝该字段，请将 `supportsEagerToolInputStreaming` 设置为 `false`。Pi 将省略 `tools[].eager_input_streaming`，并在 tool-enabled 请求中改用旧的 `fine-grained-tool-streaming-2025-05-14` beta 标头。

某些 Anthropic 模型需要自适应思考 (`thinking.type: "adaptive"` 加上 `output_config.effort`)，而不是旧的 budget-based 思考负载。内置模型会自动设置此选项。对于路由到这些模型的自定义提供商或别名，请将 `forceAdaptiveThinking` 设置为 `true`。

某些兼容 Anthropic 的提供商会发出带有空签名的思考块，并且仍然期望在重放时收到它们。仅对这些提供商将 `allowEmptySignature` 设置为 `true`；真正的 Anthropic 会拒绝空思考签名。

内置 Anthropic 模型在其模型元数据中启用了 `supportsStrictTools`。当自定义 Anthropic 兼容模型的端点接受严格的 JSON 模式工具定义时，必须将其设置为 `true`。

```json
{
  "providers": {
    "anthropic-proxy": {
      "baseUrl": "https://proxy.example.com",
      "api": "anthropic-messages",
      "apiKey": "$ANTHROPIC_PROXY_KEY",
      "compat": {
        "supportsEagerToolInputStreaming": false,
        "supportsLongCacheRetention": true,
        "forceAdaptiveThinking": true,
        "allowEmptySignature": true
      },
      "models": [
        {
          "id": "claude-opus-4-7",
          "reasoning": true,
          "input": ["text", "image"]
        }
      ]
    }
  }
}
```

| 字段 | 描述 |
|-------|-------------|
| `supportsEagerToolInputStreaming` | 提供商是否接受 per-tool `eager_input_streaming`。默认值：`true`。设置为 `false` 以省略该字段，并在 tool-enabled 请求中使用旧的 fine-grained 工具流式传输 beta 标头。 |
| `supportsLongCacheRetention` | 当缓存保留为 `long` 时，提供商是否接受 Anthropic 长缓存保留 (`cache_control.ttl: "1h"`)。默认值：`true`。 |
| `sendSessionAffinityHeaders` | 启用缓存时，是否从会话 id 发送 `x-session-affinity`。对于已知提供商，默认值：auto-detected。 |
| `supportsCacheControlOnTools` | 提供商是否接受工具定义上的 Anthropic 风格 `cache_control` 标记。默认值：`true`。 |
| `forceAdaptiveThinking` | 是否为此模型发送自适应思考 (`thinking.type: "adaptive"` 加上 `output_config.effort`)。内置自适应模型会自动设置此选项。默认值：`false`。 |
| `allowEmptySignature` | 是否将空思考签名重放为 `signature: ""`，而不是将思考转换为文本。默认值：`false`。 |
| `supportsStrictTools` | 该模型提供商是否接受严格的 JSON 模式工具定义。默认值：`false`；built-in Anthropic 模型会在生成的元数据中启用此功能。 |

## OpenAI 兼容性

对于部分兼容 OpenAI 的模型提供商，请使用 `compat` 字段。

- 提供商级别的 `compat` 会将该提供商下的所有模型应用默认值。
- 模型级别的 `compat` 会覆盖该模型的 provider-level 值。

```json
{
  "providers": {
    "local-llm": {
      "baseUrl": "http://localhost:8080/v1",
      "api": "openai-completions",
      "compat": {
        "supportsUsageInStreaming": false,
        "maxTokensField": "max_tokens"
      },
      "models": [...]
    }
  }
}
```

| 字段 | 描述 |
|-------|-------------|
| `supportsStore` | 提供商支持 `store` 字段 |
| `supportsDeveloperRole` | 使用 `developer` 而非 `system` 角色 |
| `supportsReasoningEffort` | 支持 `reasoning_effort` 参数 |
| `supportsUsageInStreaming` | 支持 `stream_options: { include_usage: true }` (默认值：`true`) |
| `supportsFinishReason` | 流式响应是否包含 `finish_reason`。当 `false` 时， pi 会在流结束时推断 `stop` 或 `toolUse`。默认值：`true`。 |
| `maxTokensField` | 使用 `max_completion_tokens` 或 `max_tokens` |
| `requiresToolResultName` | 在工具结果消息中包含 `name` |
| `requiresAssistantAfterToolResult` | 在工具结果之后、用户消息之前插入一条助手消息 |
| `requiresThinkingAsText` | 将思考块转换为纯文本 |
| `requiresReasoningContentOnAssistantMessages` | 启用推理时，在所有重放的助手消息中包含空的 `reasoning_content` |
| `thinkingFormat` | 使用 `reasoning_effort`、`openrouter`、`deepseek`、`together`、`baseten`、`zai`、`qwen`、`chat-template` 或 `qwen-chat-template` 思考参数 |
| `chatTemplateKwargs` | `chat_template_kwargs` 值用于 `thinkingFormat: "chat-template"`；使用 `{ "$var": "thinking.enabled" }` 或 `{ "$var": "thinking.effort" }` 作为 pi-controlled 思考值 |
| `chatTemplateArgs` | `chat_template_args` 值用于 `thinkingFormat: "baseten"`；使用 `{ "$var": "thinking.enabled" }` 或 `{ "$var": "thinking.effort" }` 作为 pi-controlled 思考值 |
| `cacheControlFormat` | 在系统提示词、最后一个工具定义以及最后一个用户、助手或 tool-result 文本内容上使用 Anthropic 风格的 `cache_control` 标记。目前仅支持 `anthropic`。 |
| `sendSessionAffinityHeaders` | 对于 `openai-completions`，当启用缓存时，从会话 id 发送 session-affinity 头。默认值：`false`。 |
| `sessionAffinityFormat` | 对于 `openai-completions` 和 `openai-responses`，session-affinity 头格式：`openai` 发送 `session_id`/`x-client-request-id` (补全也 `x-session-affinity`)，`openai-nosession` 省略 underscore-containing `session_id` 头，`openrouter` 发送 `x-session-id`。不影响 `prompt_cache_key` 主体参数。默认值：auto-detected。 |
| `supportsStrictMode` | 模型提供商是否接受严格的 JSON 模式函数工具定义。默认值取决于 API；built-in OpenAI 模型带有显式能力元数据。 |
| `supportsOpenAIGrammarTools` | OpenAI 兼容 API 是否发出自定义 Lark/regex 语法工具。当 `false` 时，grammar-constrained 工具回退到普通函数工具。默认值：`false`；built-in 模型目录为 GPT-5+ 模型在 OpenAI、OpenAI Codex、Azure OpenAI、GitHub Copilot、opencode 和 Cloudflare AI Gateway 上启用它。 |
| `deferredToolsMode` | 使用 provider-specific 延迟工具序列化。目前仅支持 `"kimi"` 用于 Kimi 的 OpenAI 兼容 Chat Completions 格式。 |
| `supportsLongCacheRetention` | 当缓存保留为 `long` 时，模型提供商是否接受长缓存保留：`prompt_cache_retention: "24h"` 用于 OpenAI 提示缓存，或当 `cacheControlFormat` 为 `anthropic` 时使用 `cache_control.ttl: "1h"`。默认值：`true`。 |
| `openRouterRouting` | OpenRouter 提供商路由偏好。此对象在 [OpenRouter API 请求](https://openrouter.ai/docs/guides/routing/provider-selection) 的 `provider` 字段中作为 as-is 发送。 |
| `vercelGatewayRouting` | 用于提供商选择的 Vercel AI Gateway 路由配置 (`only`, `order`) |

`openrouter` 使用 `reasoning: { effort }`。`together` 使用 `reasoning: { enabled }`，并在启用 `supportsReasoningEffort` 时也使用 `reasoning_effort`。`qwen` 使用 top-level `enable_thinking`。对于需要 `chat_template_kwargs.enable_thinking` 和 `preserve_thinking` 的本地 Qwen 兼容服务器，请使用 `qwen-chat-template`。对于需要可配置 `chat_template_kwargs` 的 vLLM/Hugging Face 聊天模板，请使用 `chat-template`，例如 DeepSeek V3.x 模板的 `chatTemplateKwargs: { "thinking": { "$var": "thinking.enabled" } }`。对于通过 `chat_template_args` 暴露切换控件并可选支持 top-level `reasoning_effort` 的提供商，请使用 `thinkingFormat: "baseten"` 配合 `chatTemplateArgs`。

`cacheControlFormat: "anthropic"` 适用于 OpenAI 兼容的提供商，这些提供商通过文本内容和工具定义上的 `cache_control` 标记暴露 Anthropic 风格的提示缓存。

示例：

```json
{
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "$OPENROUTER_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "openrouter/anthropic/claude-3.5-sonnet",
          "name": "OpenRouter Claude 3.5 Sonnet",
          "compat": {
            "openRouterRouting": {
              "allow_fallbacks": true,
              "require_parameters": false,
              "data_collection": "deny",
              "zdr": true,
              "enforce_distillable_text": false,
              "order": ["anthropic", "amazon-bedrock", "google-vertex"],
              "only": ["anthropic", "amazon-bedrock"],
              "ignore": ["gmicloud", "friendli"],
              "quantizations": ["fp16", "bf16"],
              "sort": {
                "by": "price",
                "partition": "model"
              },
              "max_price": {
                "prompt": 10,
                "completion": 20
              },
              "preferred_min_throughput": {
                "p50": 100,
                "p90": 50
              },
              "preferred_max_latency": {
                "p50": 1,
                "p90": 3,
                "p99": 5
              }
            }
          }
        }
      ]
    }
  }
}
```

Vercel AI Gateway 示例：

```json
{
  "providers": {
    "vercel-ai-gateway": {
      "baseUrl": "https://ai-gateway.vercel.sh/v1",
      "apiKey": "$AI_GATEWAY_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "moonshotai/kimi-k2.5",
          "name": "Kimi K2.5 (Fireworks via Vercel)",
          "reasoning": true,
          "input": ["text", "image"],
          "cost": { "input": 0.6, "output": 3, "cacheRead": 0, "cacheWrite": 0 },
          "contextWindow": 262144,
          "maxTokens": 262144,
          "compat": {
            "vercelGatewayRouting": {
              "only": ["fireworks", "novita"],
              "order": ["fireworks", "novita"]
            }
          }
        }
      ]
    }
  }
}
```
