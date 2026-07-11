# 模型提供商

- [ons)
- [API 密钥eys)
- [认证文件ile)
- [云服务提供商ers)
- [自定义模型提供商ers)
- [解析顺序der)

## Subscriptions

Use `/login` in interactive mode, then select a provider:

-
- Claude Pro/Max
- GitHub Copilot

Use `/logout` to clear credentials. Tokens are stored in `~/.pi/agent/auth.json` and auto-refresh when expired.

### Codex

- 需要 ChatGPT Plus 或 Pro 订阅
- Officially endorsed by OpenAI: [Codex for OSS](https://developers..com/community/codex-for-oss)

### Claude Pro/Max

Anthropic subscription auth is active for Claude Pro/Max accounts. Third-party harness usage draws from [extra usage](https://claude.ai/settings/usage) and is billed per token, not against Claude plan limits.

### GitHub Copilot

- 按 Enter 使用 github.com ，或输入你的 GitHub Enterprise Server 域名
- 如果遇到“模型不支持”，请在 VS Code 中启用： Copilot Chat → 模型选择器 → 选择模型 → “启用”

## API Keys

### 环境变量in`in interactive mode and select a provider to store an API key in`auth.json`, or set credentials via environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

| Provider                                                                   | Environment Variable            | `auth.json` key         |
| -------------------------------------------------------------------------- | ------------------------------- | ----------------------- |
| Anthropic                                                                  | `ANTHROPIC_API_KEY`             | `anthropic`             |
| Ant Ling                                                                   | `ANT_LING_API_KEY`              | `ant-ling`              |
| Azure OpenAI Responses                                                     | `nAI                            | `OPENAI_API_KEY`        | `openai` |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
| Amazon Bedrock                                                             | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
| Cloudflare AI GatewayY`(+`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_GATEWAY_ID`) | ``                              |
| Cloudflare Workers AIY`(+`CLOUDFLARE_ACCOUNT_ID`)                          | ``                              |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | `PENCODE_API_KEY`               | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | ``                              | ``                      |
|                                                                            | `XIAOMI_API_KEY`                | `xiaomi`                |
| Xiaomi MiMo Token Plan （中国）                                            | `XIAOMI_TOKEN_PLAN_CN_API_KEY`  | `xiaomi-token-plan-cn`  |
| Xiaomi MiMo Token Plan （阿姆斯特丹）                                      | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` |
| Xiaomi MiMo Token Plan （新加坡）                                          | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` |

Reference for environment variables and `auth.json` keys: [`const envMap`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/env-api-keys.ts) in [`packages/ai/src/env-api-keys.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/env-api-keys.ts).

#### Auth File

Store credentials in `~/.pi/agent/auth.json`:

```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "ant-ling": { "type": "api_key", "key": "..." },
  "openai": { "type": "api_key", "key": "sk-..." },
  "deepseek": { "type": "api_key", "key": "sk-..." },
  "nvidia": { "type": "api_key", "key": "nvapi-..." },
  "google": { "type": "api_key", "key": "..." },
  "opencode": { "type": "api_key", "key": "..." },
  "opencode-go": { "type": "api_key", "key": "..." },
  "together": { "type": "api_key", "key": "..." },
  "xiaomi": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-cn": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-ams": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-sgp": { "type": "api_key", "key": "..." }
}
```

The file is created with `0600` permissions (user read/write only). Auth file credentials take priority over environment variables.

API key credentials can also include provider-scoped environment values. These values are used before process environment variables when resolving the credential key, provider/model headers, and provider configuration such as Cloudflare account IDs, Azure OpenAI settings, Vertex project/location, Bedrock settings, `PI_CACHE_RETENTION`, and `HTTP_PROXY`/`HTTPS_PROXY`.

```json
{
  "cloudflare-ai-gateway": {
    "type": "api_key",
    "key": "$CLOUDFLARE_API_KEY",
    "env": {
      "CLOUDFLARE_API_KEY": "...",
      "CLOUDFLARE_ACCOUNT_ID": "account-id",
      "CLOUDFLARE_GATEWAY_ID": "gateway-id"
    }
  }
}
```

当 pi 需要使用与项目 shell 环境不同的模型提供商设置时，可使用此方式。

### 密钥解析

The `key` field supports command execution, environment interpolation, and literals:

- **Shell command:** `"!command"` at the start executes the whole value as a command and uses stdout (cached for process lifetime)
  ```json
  { "type": "api_key", "key": "!security find-generic-password -ws 'anthropic'" }
  { "type": "api_key", "key": "!op read 'op://vault/item/credential'" }
  ```
- **Environment interpolation:** `"$ENV_VAR"` or `"${ENV_VAR}"` uses the value of the named variable. Interpolation works inside larger literals.
  ```json
  { "type": "api_key", "key": "$MY_ANTHROPIC_KEY" }
  { "type": "api_key", "key": "${KEY_PREFIX}_${KEY_SUFFIX}" }
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR` is literal text. Missing environment variables make the value unresolved.
- **Escapes:** `"$$"` emits a literal `"$"`; `"$!"` emits a literal `"!"` without triggering command execution.
  ```json
  { "type": "api_key", "key": "$$literal-dollar-prefix" }
  { "type": "api_key", "key": "$!literal-bang-prefix" }
  ```
- **Literal value:** Used directly. Plain uppercase strings such as `MY_API_KEY` are literals; use `$MY_API_KEY` for environment variables.
  ```json
  { "type": "api_key", "key": "sk-ant-..." }
  { "type": "api_key", "key": "public" }
  ```

OAuth credentials are also stored here after `/login` and managed automatically.

## Cloud Providers

### Azure OpenAI

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# also supported: https://your-resource.cognitiveservices.azure.com
# also supported: https://your-resource.openai.azure.com
# root endpoints are auto-normalized to /openai/v1
# or use resource name instead of base URL
export AZURE_OPENAI_RESOURCE_NAME=your-resource

# Optional
export AZURE_OPENAI_API_VERSION=2024-02-01
export AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-4=my-gpt4,gpt-4o=my-gpt4o
```

### Amazon Bedrock

Use `/login amazon-bedrock` to store a Bedrock API key, or configure one of the ambient AWS credential sources below:

```bash
# Option 1: AWS Profile
export AWS_PROFILE=your-profile

# Option 2: IAM Keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# Option 3: Bearer Token
export AWS_BEARER_TOKEN_BEDROCK=...

# Optional region (defaults to us-east-1)
export AWS_REGION=us-west-2
```

Also supports ECS task roles (`AWS_CONTAINER_CREDENTIALS_*`) and IRSA (`AWS_WEB_IDENTITY_TOKEN_FILE`).

```bash
pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

Prompt caching is enabled automatically for Claude models whose ID contains a recognizable model name (base models and system-defined inference profiles). For application inference profiles (whose ARNs don't contain the model name), set `AWS_BEDROCK_FORCE_CACHE=1` to enable cache points:

```bash
export AWS_BEDROCK_FORCE_CACHE=1
pi --provider amazon-bedrock --model arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/abc123
```

如果你连接到 Bedrock API 代理，可以使用以下环境变量：

```bash
# Set the URL for the Bedrock proxy (standard AWS SDK env var)
export AWS_ENDPOINT_URL_BEDROCK_RUNTIME=https://my.corp.proxy/bedrock

# Set if your proxy does not require authentication
export AWS_BEDROCK_SKIP_AUTH=1

# Set if your proxy only supports HTTP/1.1
export AWS_BEDROCK_FORCE_HTTP1=1
```

### Cloudflare AI Gateway

`CLOUDFLARE_API_KEY` can be set via `/login`. The account ID and gateway slug can be set as environment variables or in the API key credential's `env` object in `auth.json`.

```bash
export CLOUDFLARE_API_KEY=...           # or use /login
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...        # create at dash.cloudflare.com → AI → AI Gateway
pi --provider cloudflare-ai-gateway --model "claude-sonnet-4-5"
```

Routes to OpenAI, Anthropic, and Workers AI through Cloudflare AI Gateway. Workers AI uses the Unified API (`/compat`) and prefixed model IDs (`workers-ai/@cf/...`). OpenAI uses the OpenAI passthrough route (`/openai`) with native OpenAI model IDs such as `gpt-5.1`. Anthropic uses the Anthropic passthrough route (`/anthropic`) with native Anthropic model IDs such as `claude-sonnet-4-5`.

AI Gateway authentication uses `CLOUDFLARE_API_KEY` as `cf-aig-authorization`. 上游认证entication can be one of:

| 模式                  | 请求认证                                              | Upstream auth                                         |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Workers AI            | 仅 Cloudflare 令牌e 原生                              |
| 统一计费              | Cloudflare token only                                 | Cloudflare 处理上游认证并扣除额度                     |
| 存储的自带密钥 (BYOK) | Cloudflare token only                                 | Cloudflare 注入存储在 AI Gateway 仪表盘中的提供商密钥 |
| 内联的自带密钥 (BYOK) | Cloudflare token plus upstream `Authorization` header | 请求提供上游模型提供商的密钥                          |

For normal pi usage, prefer unified billing or stored BYOK. Inline BYOK requires configuring an additional upstream `Authorization` header for the Cloudflare AI Gateway provider, for example via a `models.json` provider/model override.

### Cloudflare Workers AI

`CLOUDFLARE_API_KEY` can be set via `/login`. `CLOUDFLARE_ACCOUNT_ID` can be set as an environment variable or in the API key credential's `env` object in `auth.json`.

```bash
export CLOUDFLARE_API_KEY=...           # or use /login
export CLOUDFLARE_ACCOUNT_ID=...
pi --provider cloudflare-workers-ai --model "@cf/moonshotai/kimi-k2.6"
```

Pi automatically sets `x-session-affinity` for [prefix caching](https://developers.cloudflare.com/workers-ai/features/prompt-caching/) discounts.

### Google Vertex AI

使用应用程序默认凭证：

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1
```

Or set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key file.

## Custom Providers

**Via models.json:** Add Ollama, LM Studio, vLLM, or any provider that speaks a supported API (OpenAI Completions, OpenAI Responses, Anthropic Messages, Google Generative AI). See [models.md](models.md).

**Via extensions:** For providers that need custom API implementations or OAuth flows, create an extension. See [custom-provider.md](custom-provider.md) and [examples/extensions/custom-provider-gitlab-duo](../examples/extensions/custom-provider-gitlab-duo/).

## Resolution Order

解析模型提供商的凭证时：

1. CLI `--api-key` flag
2. `auth.json` entry (API key or OAuth token)
3. 环境变量
4. Custom provider keys from `models.json`
