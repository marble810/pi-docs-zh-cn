# 自定义模型｜ Custom Models

通过 `~/.pi/agent/models.json` 添加自定义模型提供商和模型 (Ollama, vLLM, LM Studio, 代理)。

## 目录｜ Table of Contents

- [最小示例](#minimal-example)
- [完整示例](#full-example)
- [支持的 API](#supported-apis)
- [模型提供商配置](#provider-configuration)
- [模型配置](#model-configuration)
- [覆盖内置提供商](#overriding-built-in-providers)
- [按模型覆盖](#per-model-overrides)
- [Anthropic 消息兼容性](#anthropic-messages-compatibility)
- [OpenAI 兼容性](#openai-compatibility)

## 最小示例｜ Minimal Example

对于本地模型 (Ollama, LM Studio, vLLM)，每个模型只需 `id`：

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

`apiKey` 值是一个占位符，因为 Ollama 会忽略它。pi 仍然认为模型需要认证才能出现在 `/model` 中，因此无密钥的本地服务器应保留一个虚拟值，使用 `/login` 为该提供商保存一个密钥，或者在选择模型时传递 `--api-key`。

某些 OpenAI-兼容的服务器无法理解用于 reasoning-capable 模型的 `developer` 角色。对于这些提供商，将 `compat.supportsDeveloperRole` 设置为 `false`，这样 pi 会将系统提示作为 `system` 消息发送。如果服务器也不支持 `reasoning_effort`，同时也将 `compat.supportsReasoningEffort` 设置为 `false`。

你可以在提供商级别设置 `compat` 以应用于所有模型，或在模型级别设置以覆盖特定模型。这通常适用于 Ollama、vLLM、SGLang 及类似的 OpenAI-兼容服务器。

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

当你需要特定值时覆盖默认值：

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

每次打开 `/model` 时，文件都会重新加载。在会话期间编辑；无需重启。

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

向 `google-generative-ai` API 类型添加自定义模型时，需要 `baseUrl`。

## 支持的 API

| API | 描述 |
|-----|-------------|
| `openai-completions` | OpenAI 聊天补全 (最兼容) |
| `openai-responses` | OpenAI 响应 API |
| `anthropic-messages` | Anthropic 消息 API |
| `google-generative-ai` | Google Generative AI |

在模型提供商级别设置 `api` (所有模型的默认值)，或在模型级别设置 (覆盖每个模型)。

## 提供商配置

| 字段 | 描述 |
|-------|-------------|
| `baseUrl` | API 端点 URL |
| `api` | API 类型 (见上文) |
| `apiKey` | 可选的 API 密钥配置 (见下方值解析)。当通过 `/login`/`auth.json` 或 CLI `--api-key` 提供身份验证时，可省略此项。 |
| `oauth` | 动态 OAuth 模型提供商类型。当前支持 `"radius"`；需要网关 `baseUrl`。 |
| `headers` | 自定义标头 (参见下方值解析) |
| `authHeader` | 设置 `true` 以自动添加 `Authorization: Bearer <apiKey>` |
| `models` | 模型配置数组 |
| `modelOverrides` | 此模型提供商上 built-in 或 extension-registered 模型的逐模型覆盖 |

对于具有 `models` 的模型提供商，non-built-in 模型提供商配置需要 `baseUrl` 以及提供商或模型级别的 `api` 值。加载文件不需要 `apiKey`：当通过 `/login`/`auth.json`、CLI `--api-key` 或提供商 `apiKey` 配置认证时，模型变为可用。如果未配置认证，模型会加载但在 `/model` 和 `--list-models` 中保持不可用。

### 值解析｜ Value Resolution

`apiKey` 和 `headers` 字段支持命令执行、环境插值和字面量：

- **Shell 命令：** 开头的 `"!command"` 将整个值作为命令执行并使用 stdout
 ```json
  "apiKey": "!security find-generic-password -ws 'anthropic'"
  "apiKey": "!op read 'op://vault/item/credential'"
  ```
- **环境插值：** `"$ENV_VAR"` 或 `"${ENV_VAR}"` 使用命名变量的值。插值在较大的字面量内部起作用。
 ```json
  "apiKey": "$MY_API_KEY"
  "apiKey": "${KEY_PREFIX}_${KEY_SUFFIX}"
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR` 是字面文本。缺少环境变量会使值无法解析。
- **转义：** `"$"` 输出字面的 `"$"`；`"$!"` 输出字面的 `"!"`，而不触发命令执行。
 ```json
  "apiKey": "$literal-dollar-prefix"
  "apiKey": "$!literal-bang-prefix"
  ```
- **字面量：** 直接使用。像 `MY_API_KEY` 这样的纯大写字符串是字面量；对于环境变量请使用 `$MY_API_KEY`。
 ```json
  "apiKey": "sk-..."
  ```

对于 `models.json`， shell 命令在请求时解析。pi 有意不应用 built-in TTL、陈旧重用或任意命令的恢复逻辑。不同的命令需要不同的缓存和失败策略， pi 无法推断出正确的策略。

如果你的命令缓慢、昂贵、rate-limited，或者应在临时故障时继续使用先前的值，请将其封装到你自己的脚本或命令中，实现你想要的缓存或 TTL 行为。

`/model` 可用性检查使用已配置的认证存在性，并且不执行 shell 命令。

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
| `id` | 是 | — | 模型标识符 (传递给 API) |
| `name` | 否 | `id` | 人类可读的模型标签。用于匹配 (`--model` 模式)，并显示为次要模型详情文本。 |
| `api` | 否 | 提供商的 `api` | 覆盖此模型的提供商 API |
| `reasoning` | 否 | `false` | 支持扩展思考 |
| `thinkingLevelMap` | 否 | 省略 | 将 pi 思考级别映射到提供商值，并标记不支持的级别 (见下方) |
| `input` | 否 | `["text"]` | 输入类型：`["text"]` 或 `["text", "image"]` |
| `contextWindow` | 否 | `128000` | 上下文窗口大小（以 token 计） |
| `maxTokens` | 否 | `16384` | 最大输出 token 数 |
| `cost` | 否 | 全零 | 按million-token的费率，带有可选的request-wide输入定价层级 |
| `compat` | 否 | 模型提供商 `compat` | 模型提供商兼容性覆盖。当两者都设置时，与provider-level `compat`合并。 |

成本层级提供完整的备选费率集，当总输入使用量(`input + cacheRead + cacheWrite`)超过`inputTokensAbove`时，应用于整个请求。当多个层级匹配时，最高阈值生效。

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
- `/model`、`--list-models`和交互式页脚按模型`id`显示条目。
- 配置的`name`用于模型匹配和辅助模型详细信息文本。它不会替换页脚/status-bar模型 ID。

### 思考层级映射｜ Thinking Level Map

使用模型上的`thinkingLevelMap`来描述model-specific思考控制。键是 pi 思考层级：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`。映射可能包含空洞；例如，一个模型可以暴露`high`和`max`而不暴露`xhigh`。

三态值：

| 值 | 含义 |
|-------|---------|
| 省略 | 标准级别（直至 `high`）使用提供商的默认映射；扩展的 `xhigh` 和 `max` 级别不受支持 |
| 字符串 | 级别受支持，此值会发送给提供商 |
| `null` | 级别不受支持，被隐藏/跳过/限制掉 |

示例：模型仅支持关闭、高和最大推理：

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

示例：模型不允许禁用思考功能：

```json
{
  "id": "always-thinking-model",
  "reasoning": true,
  "thinkingLevelMap": {
    "off": null
  }
}
```

迁移：使用过 `compat.reasoningEffortMap` 的旧配置应将该映射移至 model-level `thinkingLevelMap`。对于不应在 UI 中出现的级别，请使用 `null`。

## 覆盖内置提供商｜ Overriding Built-in Providers

通过代理路由 built-in 提供商，无需重新定义模型：

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
- 内置模型保留。
- 自定义模型通过提供商内的 `id` 进行 upsert （更新或插入）。
- 如果自定义模型 `id` 匹配 built-in 模型 `id`，则该自定义模型替换该 built-in 模型。
- 如果自定义模型 `id` 是新的，它会与 built-in 模型一起添加。

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

`modelOverrides` 支持每个模型下的以下字段：`name`、`reasoning`、`thinkingLevelMap`、`input`、`cost` (partial)、`contextWindow`、`maxTokens`、`headers`、`compat`。

Direct OpenAI GPT-5.6 Sol、Terra 和 Luna 默认使用 `272000` 上下文窗口，以便请求保持在 OpenAI 的 short-context 定价层内。若要选择使用 OpenAI 的 1.05M 上下文窗口，请为您使用的每个模型增加它：

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

该覆盖保留 built-in 定价元数据。总输入 token 超过 272K 的请求对整个请求使用 GPT-5.6 的 long-context 费率。如有需要，将相同的覆盖应用于 `gpt-5.6-terra` 或 `gpt-5.6-luna`。

行为说明：
- `modelOverrides` 应用于 built-in 提供商模型和匹配的 extension-registered 提供商模型。
- 未知的模型 ID 将被忽略。
- 您可以将 provider-level `baseUrl`/`headers` 与 `modelOverrides` 结合使用。
- 覆盖 `name` 仅更改模型匹配和辅助详细信息文本；页脚和主模型列表继续显示模型 `id`。
- 如果还为某个提供商定义了 `models`，则自定义模型会在 built-in 覆盖之后合并。具有相同 `id` 的自定义模型会替换被覆盖的 built-in 模型条目。

## Anthropic 消息兼容性｜ Anthropic Messages Compatibility

对于使用 `api: "anthropic-messages"` 的提供商或代理，请使用 `compat` 来控制 Anthropic 特定的请求兼容性。

默认情况下， pi 发送 per-tool `eager_input_streaming: true`。如果代理或与 Anthropic 兼容的后端拒绝该字段，则将 `supportsEagerToolInputStreaming` 设置为 `false`。Pi 将省略 `tools[].eager_input_streaming`，并改为发送旧的 `fine-grained-tool-streaming-2025-05-14` beta 标头以处理 tool-enabled 请求。

某些 Anthropic 模型要求使用自适应思考 (`thinking.type: "adaptive"` 加上 `output_config.effort`)，而不是旧的 budget-based 思考负载。内置模型会自动设置此项。对于路由到这些模型的自定义提供商或别名，请将 `forceAdaptiveThinking` 设置为 `true`。

某些与 Anthropic 兼容的提供商发出带有空签名的思考块，但仍然希望在重放时接收它们。仅对这些提供商将 `allowEmptySignature` 设置为 `true`；真正的 Anthropic 拒绝空的思考签名。

内置的 Anthropic 模型在其模型元数据中启用 `supportsStrictTools`。当自定义与 Anthropic 兼容的模型的端点接受严格的 JSON 架构工具定义时，必须将其设置为 `true`。

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
| `supportsEagerToolInputStreaming` | 提供商是否接受 per-tool `eager_input_streaming`。默认值：`true`。设置为 `false` 以省略该字段，并在 tool-enabled 请求上使用旧的 fine-grained 工具流式传输 beta 标头。 |
| `supportsLongCacheRetention` | 当缓存保留时间为 `long` 时，提供商是否接受 Anthropic 长缓存保留 (`cache_control.ttl: "1h"`)。默认值：`true`。 |
| `sendSessionAffinityHeaders` | 是否在启用缓存时从会话 ID 发送 `x-session-affinity`。默认值：对于已知提供商，为 auto-detected。 |
| `supportsCacheControlOnTools` | 提供商是否接受工具定义上的 Anthropic 风格 `cache_control` 标记。默认值：`true`。 |
| `forceAdaptiveThinking` | 是否为此模型发送自适应思考 (`thinking.type: "adaptive"`加上`output_config.effort`)。内置自适应模型自动设置此值。默认值：`false`。 |
| `allowEmptySignature` | 是否将空思考签名重放为`signature: ""`而不是将思考转换为文本。默认值：`false`。 |
| `supportsStrictTools` | 模型提供商是否接受严格的JSON-模式工具定义。默认值：`false`；built-in Anthropic 模型在生成的元数据中启用它。 |

## OpenAI 兼容性

对于具有部分OpenAI兼容性的提供商，使用`compat`字段。

- 提供商级别的`compat`将默认值应用于该提供商下的所有模型。
- 模型级别的`compat`覆盖该模型的provider-level值。

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
| `supportsStore` | 提供商支持`store`字段 |
| `supportsDeveloperRole` | 使用`developer`与`system`角色 |
| `supportsReasoningEffort` | 支持`reasoning_effort`参数 |
| `supportsUsageInStreaming` | 支持`stream_options: { include_usage: true }`(默认值：`true`) |
| `maxTokensField` | 使用`max_completion_tokens`或`max_tokens` |
| `requiresToolResultName` | 在工具结果消息中包含`name` |
| `requiresAssistantAfterToolResult` | 在工具结果之后，在用户消息之前插入一条助手消息 |
| `requiresThinkingAsText` | 将思考块转换为纯文本 |
| `requiresReasoningContentOnAssistantMessages` | 当启用推理时，在所有重放的助手消息中包含空的`reasoning_content` |
| `thinkingFormat` | 使用`reasoning_effort`、`openrouter`、`deepseek`、`together`、`zai`、`qwen`、`chat-template`或`qwen-chat-template`思考参数 |
| `chatTemplateKwargs` | 为`thinkingFormat: "chat-template"`使用`chat_template_kwargs`值；对于pi-controlled思考值，使用`{ "$var": "thinking.enabled" }`或`{ "$var": "thinking.effort" }` |
| `cacheControlFormat` | 在系统提示词、最后一个工具定义以及最后一条用户、助手或tool-result文本内容上使用 Anthropic 风格的`cache_control`标记。当前仅支持`anthropic`。 |
| `sendSessionAffinityHeaders` | 对于`openai-completions`，当启用缓存时，从会话 id 发送session-affinity标头。默认值：`false`。 |
| `sessionAffinityFormat` | 对于`openai-completions`和`openai-responses`，session-affinity标头格式：`openai`发送`session_id`/`x-client-request-id` (补全同时也`x-session-affinity`)，`openai-nosession`省略underscore-containing的`session_id`标头，`openrouter`发送`x-session-id`。不影响`prompt_cache_key`主体参数。默认值：auto-detected。 |
| `supportsStrictMode` | 是否提供商接受严格的JSON模式函数工具定义。默认值取决于API；built-in OpenAI模型携带明确的能力元数据。 |
| `supportsOpenAIGrammarTools` | 是否OpenAI兼容的 API 发出自定义 Lark/正则表达式语法工具。当`false`时，grammar-constrained工具回退到普通函数工具。默认值：`false`；built-in模型目录为OpenAI上的GPT-5+模型、OpenAI Codex、Azure OpenAI、GitHub Copilot、opencode 和 Cloudflare AI Gateway 启用了此功能。 |
| `deferredToolsMode` | 使用provider-specific延迟工具序列化。当前仅`"kimi"`被支持用于 Kimi 的OpenAI兼容聊天补全格式。 |
| `supportsLongCacheRetention` | 当缓存保留设置为`long`时，提供商是否接受长缓存保留：对于OpenAI提示缓存为`prompt_cache_retention: "24h"`，或者当`cacheControlFormat`为`anthropic`时为`cache_control.ttl: "1h"`。默认值：`true`。 |
| `openRouterRouting` | OpenRouter 的模型提供商路由偏好。该对象在 [OpenRouter API 请求](https://openrouter.ai/docs/guides/routing/provider-selection) 的 `provider` 字段中作为 as-is 发送。 |
| `vercelGatewayRouting` | Vercel AI Gateway 用于模型提供商选择的路由配置 (`only`, `order`) |

`openrouter` 使用 `reasoning: { effort }`。`together` 使用 `reasoning: { enabled }`，并在启用 `supportsReasoningEffort` 时还使用 `reasoning_effort`。`qwen` 使用 top-level `enable_thinking`。对于需要 `chat_template_kwargs.enable_thinking` 和 `preserve_thinking` 的本地 Qwen 兼容服务器，请使用 `qwen-chat-template`。对于需要可配置 `chat_template_kwargs` 的 vLLM/Hugging Face 聊天模板（例如用于 DeepSeek V3.x 模板的 `chatTemplateKwargs: { "thinking": { "$var": "thinking.enabled" } }`），请使用 `chat-template`。

`cacheControlFormat: "anthropic"` 用于 OpenAI 兼容的模型提供商，这些提供商通过在文本内容和工具定义上使用 `cache_control` 标记来暴露 Anthropic 风格的提示缓存。

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
