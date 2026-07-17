# 自定义模型

通过`~/.pi/agent/models.json`添加自定义模型提供商与模型，例如(Ollama、vLLM、LM Studio、代理)。

## 目录｜ Table of Contents

- [最小示例｜ Minimal Example](#minimal-example)
- [完整示例｜ Full Example](#full-example)
- [支持的 API ｜ Supported APIs](#supported-apis)
- [模型提供商配置｜模型提供商 配置](#provider-configuration)
- [模型配置｜ Model 配置](#model-configuration)
- [覆盖内置提供商｜ Overriding Built-in Providers](#overriding-built-in-providers)
- [按模型覆盖｜ Per-model Overrides](#per-model-overrides)
- [Anthropic 消息兼容性｜ Anthropic Messages Compatibility](#anthropic-messages-compatibility)
- [OpenAI 兼容性](#openai-compatibility)

## 最小示例｜ Minimal Example

对于本地模型 (Ollama、LM Studio、vLLM)，每个模型仅需 `id`。

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

`apiKey` 值是一个占位符，因为 Ollama 会忽略它。pi 仍然将模型视为需要在 `/model` 中出现前进行认证，因此无密钥的本地服务器应保留一个虚拟值，使用 `/login` 为该提供商保存一个密钥，或在选择模型时传递 `--api-key`。

某些 OpenAI 兼容的服务器不理解用于 reasoning-capable 模型的 `developer` 角色。对于这些提供商，将 `compat.supportsDeveloperRole` 设置为 `false`，以便 pi 将系统提示词作为 `system` 消息发送。如果服务器也不支持 `reasoning_effort`，则同时将 `compat.supportsReasoningEffort` 设置为 `false`。

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

## 完整示例｜ Full Example

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

每次打开 `/model` 时，文件会重新加载。在会话期间编辑，无需重启。

## Google AI Studio 示例｜ Google AI Studio Example

使用 `google-generative-ai` 配合 `baseUrl` 来添加来自 Google AI Studio 的模型，包括自定义 Gemma 4 条目：

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

将自定义模型添加到 `google-generative-ai` API 类型时需要 `baseUrl`。

## 支持的 API ｜ Supported APIs

| API | 描述 |
|-----|-------------|
| `openai-completions` | OpenAI Chat Completions (最兼容) |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic Messages API |
| `google-generative-ai` | Google Generative AI |

在提供者级别设置 `api` (所有模型的默认值)，或在模型级别 (覆盖每个模型)。

## 提供者配置｜模型提供商 配置

| 字段 | 描述 |
|-------|-------------|
| `baseUrl` | API 端点 URL |
| `api` | API 类型 (见上文) |
| `apiKey` | 可选的 API 密钥配置 (见下文值解析)。当认证由 `/login`/`auth.json` 或 CLI `--api-key` 提供时，省略它。 |
| `oauth` | 动态 OAuth 提供者类型。当前支持 `"radius"`；需要网关 `baseUrl`。 |
| `headers` | 自定义标头 (见下文值解析) |
| `authHeader` | 设置 `true` 以自动添加 `Authorization: Bearer <apiKey>` |
| `models` | 模型配置数组 |
| `modelOverrides` | 此提供商上built-in或extension-registered模型的每个模型覆盖 |

对于具有`models`的提供商，non-built-in提供商配置需要`baseUrl`以及在提供商或模型级别的`api`值。加载文件不需要`apiKey`：当通过`/login`/`auth.json`、CLI `--api-key`或提供商`apiKey`配置身份验证时，模型变为可用。如果未配置身份验证，模型将加载但在`/model`和`--list-models`中保持不可用。

### 值解析｜ Value Resolution

`apiKey`和`headers`字段支持命令执行、环境变量插值和字面量：

- **Shell 命令：**开头的`"!command"`将整个值作为命令执行并使用标准输出
 ```json
  "apiKey": "!security find-generic-password -ws 'anthropic'"
  "apiKey": "!op read 'op://vault/item/credential'"
  ```
- **环境变量插值：** `"$ENV_VAR"`或`"${ENV_VAR}"`使用命名变量的值。插值在更大的字面量中有效。
 ```json
  "apiKey": "$MY_API_KEY"
  "apiKey": "${KEY_PREFIX}_${KEY_SUFFIX}"
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR`是字面文本。缺少环境变量会使该值未解析。
- **转义：** `"$"`输出字面量`"$"`；`"$!"`输出字面量`"!"`而不触发命令执行。
 ```json
  "apiKey": "$literal-dollar-prefix"
  "apiKey": "$!literal-bang-prefix"
  ```
- **字面值：**直接使用。纯大写字符串如`MY_API_KEY`是字面量；使用`$MY_API_KEY`表示环境变量。
 ```json
  "apiKey": "sk-..."
  ```

对于`models.json`， Shell 命令在请求时解析。pi 有意不将built-in TTL、过时重用或恢复逻辑应用于任意命令。不同命令需要不同的缓存和失败策略， pi 无法推断正确的策略。

如果您的命令速度慢、成本高、rate-limited，或者在瞬时故障时应继续使用先前的值，请将其包装在您自己的脚本或命令中，实现所需的缓存或TTL行为。

`/model`可用性检查使用配置的身份验证存在性，不执行 Shell 命令。

### 自定义标头｜ Custom Headers

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

| 字段 | 必需 | 默认 | 描述 |
|-------|----------|---------|-------------|
| `id` | 是 | — | 模型标识符(传递给API) |
| `name` | 否 | `id` | 人类可读的模型标签。用于匹配(`--model`模式)，并显示为次要模型详情文本。 |
| `api` | 否 | 提供商的`api` | 覆盖此模型提供商的API |
| `reasoning` | 否 | `false` | 支持扩展思考 |
| `thinkingLevelMap` | 否 | 省略 | 将 Pi 思考级别映射到提供商的值，并标记不支持的级别(见下文) |
| `input` | 否 | `["text"]` | 输入类型：`["text"]`或`["text", "image"]` |
| `contextWindow` | 否 | `128000` | 上下文窗口大小（令牌数） |
| `maxTokens` | 否 | `16384` | 最大输出令牌数 |
| `cost` | 否 | 全零 | 按million-token的费率，可选request-wide输入定价层级 |
| `compat` | 否 | 模型提供商`compat` | 模型提供商兼容性覆盖。当两者都设置时，与provider-level `compat`合并。 |

成本层级提供完整的替代费率集，并在总输入使用量(`input + cacheRead + cacheWrite`)超过`inputTokensAbove`时应用于整个请求。当多个层级匹配时，阈值最高的获胜。

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
- `/model`、`--list-models`以及交互式页脚按模型`id`显示条目。
- 配置的`name`用于模型匹配和次要模型详情文本。它不会替换页脚/status-bar模型 ID。

### 思考层级映射｜ Thinking Level Map

在模型上使用`thinkingLevelMap`来描述model-specific思考控制。键是 pi 思考层级：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`。映射可能包含空缺；例如，模型可以暴露`high`和`max`而不暴露`xhigh`。

值是三态的：

| 值 | 含义 |
|-------|---------|
| 省略 | 标准层级直至`high`使用模型提供商的默认映射；扩展层级`xhigh`和`max`不受支持 |
| 字符串 | 支持该等级，此值会发送给模型提供商 |
| `null` | 不支持该等级，会被隐藏/跳过/截断 |

示例：仅支持关闭、高和最大推理级别的模型：

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

示例：无法关闭思考功能的模型：

```json
{
  "id": "always-thinking-model",
  "reasoning": true,
  "thinkingLevelMap": {
    "off": null
  }
}
```

迁移：旧配置中使用`compat.reasoningEffortMap`的，应将该映射移至model-level `thinkingLevelMap`。对于不应出现在 UI 中的等级，请使用`null`。

## 覆盖内置提供商｜ Overriding Built-in Providers

通过代理路由built-in提供商，无需重新定义模型：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

所有built-in Anthropic 模型仍然可用。现有的 OAuth 或API密钥认证继续有效。

要将自定义模型合并到built-in提供商，请包含`models`数组：

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
- 保留内置模型。
- 自定义模型通过提供商内部的`id`进行更新插入。
- 如果自定义模型`id`与built-in模型`id`匹配，则自定义模型会替换该built-in模型。
- 如果自定义模型`id`是新的，则会将其与built-in模型一起添加。

## 每个模型的覆盖｜ Per-model Overrides

使用`modelOverrides`自定义built-in模型和匹配的extension-registered模型，而无需替换提供商的完整模型列表。

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

`modelOverrides`支持每个模型的以下字段：`name`、`reasoning`、`thinkingLevelMap`、`input`、`cost` (partial)、`contextWindow`、`maxTokens`、`headers`、`compat`。

直接OpenAI GPT-5.6 Sol、Terra 和 Luna 默认为 `272000` 上下文窗口，因此请求保持在 OpenAI 的 short-context 定价层级内。要选择使用 OpenAI 的 1.05M 上下文窗口，请为您使用的每个模型增加：

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

该覆盖会保留built-in定价元数据。总输入令牌超过 272K 的请求，整个请求使用GPT-5.6 的long-context费率。需要时对`gpt-5.6-terra`或`gpt-5.6-luna`应用相同的覆盖。

行为说明：
- `modelOverrides`应用于built-in提供商模型和匹配的extension-registered提供商模型。
- 未知模型 ID 将被忽略。
- 您可以将provider-level `baseUrl`/`headers`与`modelOverrides`结合使用。
- 覆盖 `name` 仅更改模型匹配和次要详情文本；页脚和主模型列表继续显示模型 `id`。
- 如果还为提供商定义了 `models`，则自定义模型会在 built-in 覆盖之后合并。具有相同 `id` 的自定义模型会替换被覆盖的 built-in 模型条目。

## Anthropic Messages 兼容性｜ Anthropic Messages Compatibility

对于使用 `api: "anthropic-messages"` 的提供商或代理，使用 `compat` 来控制 Anthropic 特定请求兼容性。

默认情况下， pi 发送 per-tool `eager_input_streaming: true`。如果代理或 Anthropic 兼容后端拒绝该字段，将 `supportsEagerToolInputStreaming` 设置为 `false`。Pi 将省略 `tools[].eager_input_streaming` 并发送旧的 `fine-grained-tool-streaming-2025-05-14` beta 头以供 tool-enabled 请求使用。

某些 Anthropic 模型需要自适应思维 (`thinking.type: "adaptive"` 加上 `output_config.effort`)，而不是旧的 budget-based 思维载荷。内置模型会自动设置此项。对于路由到这些模型的自定义提供商或别名，将 `forceAdaptiveThinking` 设置为 `true`。

某些 Anthropic 兼容提供商会发出带有空签名的思维块，并且仍然期望在重放时保留它们。仅对这些提供商将 `allowEmptySignature` 设置为 `true`；真正的 Anthropic 会拒绝空的思维签名。

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

| 字段｜ Field | 描述｜ Description |
|-------|-------------|
| `supportsEagerToolInputStreaming` | 提供商是否接受 per-tool `eager_input_streaming`。默认值：`true`。设置为 `false` 以省略该字段并在 tool-enabled 请求上使用旧的 fine-grained 工具流式传输 beta 头。 |
| `supportsLongCacheRetention` | 提供商在缓存保留为 `long` 时是否接受 Anthropic 长缓存保留 (`cache_control.ttl: "1h"`)。默认值：`true`。 |
| `sendSessionAffinityHeaders` | 是否在启用缓存时从会话 id 发送 `x-session-affinity`。默认值：对于已知提供商为 auto-detected。 |
| `supportsCacheControlOnTools` | 提供商是否接受工具定义上的 Anthropic 样式 `cache_control` 标记。默认值：`true`。 |
| `forceAdaptiveThinking` | 是否为此模型发送自适应思维 (`thinking.type: "adaptive"` 加上 `output_config.effort`)。内置自适应模型会自动设置此项。默认值：`false`。 |
| `allowEmptySignature` | 是否将空思维签名作为 `signature: ""` 重放，而不是将思维转换为文本。默认值：`false`。 |

## OpenAI 兼容性

对于部分 OpenAI 兼容的提供商，请使用 `compat` 字段。

- 提供商级别的 `compat` 将默认值应用于该提供商下的所有模型。
- 模型级别的`compat`会覆盖该模型的provider-level值。

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
| `supportsStore` | 模型提供商支持`store`字段 |
| `supportsDeveloperRole` | 使用`developer`与`system`角色 |
| `supportsReasoningEffort` | 支持`reasoning_effort`参数 |
| `supportsUsageInStreaming` | 支持`stream_options: { include_usage: true }`(默认值：`true`) |
| `maxTokensField` | 使用`max_completion_tokens`或`max_tokens` |
| `requiresToolResultName` | 在工具结果消息中包含`name` |
| `requiresAssistantAfterToolResult` | 在工具结果之后，在用户消息之前插入一条助手消息 |
| `requiresThinkingAsText` | 将思考块转换为纯文本 |
| `requiresReasoningContentOnAssistantMessages` | 启用推理时，在所有重播的助手消息中包含空的`reasoning_content` |
| `thinkingFormat` | 使用`reasoning_effort`、`openrouter`、`deepseek`、`together`、`zai`、`qwen`、`chat-template`或`qwen-chat-template`思考参数 |
| `chatTemplateKwargs` | 对于 `thinkingFormat: "chat-template"`，使用 `chat_template_kwargs` 值；对于 pi-controlled 思考值，使用 `{ "$var": "thinking.enabled" }` 或 `{ "$var": "thinking.effort" }`。 |
| `cacheControlFormat` | 在系统提示词、最后一个工具定义和最后一个用户/助手文本内容上使用 Anthropic 风格的 `cache_control` 标记。目前仅支持 `anthropic`。 |
| `sendSessionAffinityHeaders` | 对于 `openai-completions`，当启用缓存时，发送来自会话 id 的 session-affinity 头。默认值：`false`。 |
| `sessionAffinityFormat` | 对于 `openai-completions` 和 `openai-responses`，session-affinity 头格式为：`openai` 发送 `session_id`/`x-client-request-id`(补全也 `x-session-affinity`)，`openai-nosession` 省略 underscore-containing`session_id` 头，`openrouter` 发送 `x-session-id`。不影响 `prompt_cache_key` 主体参数。默认值：auto-detected。 |
| `supportsStrictMode` | 在工具定义中包含 `strict` 字段 |
| `deferredToolsMode` | 使用 provider-specific 延迟工具序列化。目前仅支持 `"kimi"` 用于 Kimi 的 OpenAI 兼容 Chat Completions 格式。 |
| `supportsLongCacheRetention` | 当缓存保留设置为 `long` 时，模型提供商是否接受长缓存保留：对于 OpenAI 提示缓存为 `prompt_cache_retention: "24h"`，或者当 `cacheControlFormat` 为 `anthropic` 时为 `cache_control.ttl: "1h"`。默认值：`true`。 |
| `openRouterRouting` | OpenRouter 模型提供商路由偏好。此对象作为 as-is 发送在 [OpenRouter API 请求](https://openrouter.ai/docs/guides/routing/provider-selection) 的 `provider` 字段中。 |
| `vercelGatewayRouting` | Vercel AI Gateway 的模型提供商选择路由配置 (`only`, `order`) |

`openrouter` 使用 `reasoning: { effort }`。`together` 使用 `reasoning: { enabled }`，并且在启用 `supportsReasoningEffort` 时也使用 `reasoning_effort`。`qwen` 使用 top-level`enable_thinking`。对于需要 `chat_template_kwargs.enable_thinking` 和 `preserve_thinking` 的本地 Qwen 兼容服务器，使用 `qwen-chat-template`。对于需要可配置 `chat_template_kwargs` 的 vLLM/Hugging Face 聊天模板，使用 `chat-template`，例如用于 DeepSeekV3.x 模板的 `chatTemplateKwargs: { "thinking": { "$var": "thinking.enabled" } }`。

`cacheControlFormat: "anthropic"` 用于 OpenAI 兼容的模型提供商，这些提供商通过文本内容和工具定义上的 `cache_control` 标记公开 Anthropic 风格的提示缓存。

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
