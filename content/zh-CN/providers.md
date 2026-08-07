# 提供商

Pi 通过 OAuth 支持 subscription-based 提供商，并通过环境变量或认证文件支持 API 密钥提供商。内置目录随 pi 一起提供；配置的提供商可以刷新较新的目录并将其缓存在 `~/.pi/agent/models-store.json` 中以供离线使用。

## 目录

- [订阅](#subscriptions)
- [API 密钥](#api-keys)
- [认证文件](#auth-file)
- [云提供商](#cloud-providers)
- [llama.cpp](#llamacpp)
- [自定义提供商](#custom-providers)
- [解析顺序](#resolution-order)

## 订阅

在交互模式下使用 `/login`，然后选择一个提供商：

- ChatGPT Plus/Pro (Codex)
- Claude Pro/Max
- GitHub Copilot
- xAI (Grok/X 订阅)
- OpenRouter (OAuth 铸造的 API 密钥，从 OpenRouter 积分计费)
- Radius

使用 `/logout` 清除凭据。令牌存储在 `~/.pi/agent/auth.json` 中，过期后存储在 auto-refresh 中。OpenRouter 改为铸造一个不会自动过期的 user-controlled API 密钥。

### OpenAI Codex

- 需要 ChatGPT Plus 或 Pro 订阅
- 由 OpenAI 官方认可：[Codex for OSS](https://developers.openai.com/community/codex-for-oss)

### Claude Pro/Max

Anthropic 订阅认证对 Claude Pro/Max 账户有效。第三方运行框架的使用会消耗[额外用量](https://claude.ai/settings/usage)，并按令牌计费，不计入 Claude 套餐限制。

### GitHub Copilot

- 按 Enter 使用 github.com，或输入您的 GitHub Enterprise Server 域名
- 如果出现“模型不受支持”，请在 VS Code 中启用它： Copilot Chat → 模型选择器 → 选择模型 → “启用”

### xAI (Grok/X 订阅)

- 运行 `/login xai`，然后选择 **使用订阅**
- `XAI_API_KEY` 仍可通过 **使用 API 密钥** 使用

### OpenRouter

- 运行 `/login openrouter`，然后选择 **使用 OpenRouter 登录** 以打开 OpenRouter PKCE 授权流程
- 授权会创建一个 user-controlled OpenRouter API 密钥，从您的 OpenRouter 积分中计费
- 在远程/无头机器上(e.g。通过 SSH) 浏览器无法访问回环回调；请将最终重定向 URL (或授权代码) 粘贴到登录提示中
- `OPENROUTER_API_KEY` 仍可通过 **使用 API 密钥** 使用

### Radius

Radius 是一个动态的 `pi-messages` 网关。`/login radius` 将 OAuth 令牌存储在 `auth.json` 中；网关目录独立刷新并缓存在 `models-store.json` 中。自定义 Radius 网关可以在 `models.json` 中使用 `"oauth": "radius"` 和网关 `baseUrl` 声明。

## API 密钥

### 环境变量或认证文件

在交互模式下使用 `/login` 并选择提供商，将 API 密钥存储在 `auth.json` 中，或通过环境变量设置凭据：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

| 提供商 | 环境变量 | `auth.json` 密钥 |
|----------|----------------------|------------------|
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic` |
| Ant Ling | `ANT_LING_API_KEY` | `ant-ling` |
| Azure OpenAI 响应 | `AZURE_OPENAI_API_KEY` | `azure-openai-responses` |
| OpenAI | `OPENAI_API_KEY` | `openai` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek` |
| NVIDIA NIM | `NVIDIA_API_KEY` | `nvidia` |
| Google Gemini | `GEMINI_API_KEY` | `google` |
| Amazon Bedrock | `AWS_BEARER_TOKEN_BEDROCK` | `amazon-bedrock` |
| Mistral | `MISTRAL_API_KEY` | `mistral` |
| Groq | `GROQ_API_KEY` | `groq` |
| Cerebras | `CEREBRAS_API_KEY` | `cerebras` |
| Cloudflare AI Gateway | `CLOUDFLARE_API_KEY` (+ `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_GATEWAY_ID`) | `cloudflare-ai-gateway` |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY` (+ `CLOUDFLARE_ACCOUNT_ID`) | `cloudflare-workers-ai` |
| xAI | `XAI_API_KEY` | `xai` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` |
| ZAI 编码计划 (全局) | `ZAI_API_KEY` | `zai` |
| ZAI 编码计划 (中国) | `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` |
| OpenCode Zen | `OPENCODE_API_KEY` | `opencode` |
| OpenCode Go | `OPENCODE_API_KEY` | `opencode-go` |
| Radius | `RADIUS_API_KEY` | `radius` |
| Hugging Face | `HF_TOKEN` | `huggingface` |
| Fireworks | `FIREWORKS_API_KEY` | `fireworks` |
| Together AI | `TOGETHER_API_KEY` | `together` |
| Baseten | `BASETEN_API_KEY` | `baseten` |
| Kimi For Coding | `KIMI_API_KEY` | `kimi-coding` |
| MiniMax | `MINIMAX_API_KEY` | `minimax` |
| MiniMax (中国) | `MINIMAX_CN_API_KEY` | `minimax-cn` |
| Qwen Token Plan (现有目录) | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan` |
| Qwen Token Plan (个人) | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan-individual` |
| Qwen Token Plan (中国) | `QWEN_TOKEN_PLAN_CN_API_KEY` | `qwen-token-plan-cn` |
| Xiaomi MiMo | `XIAOMI_API_KEY` | `xiaomi` |
| 小米 MiMo Token 计划 (中国) | `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` |
| 小米 MiMo Token 计划 (阿姆斯特丹) | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` |
| 小米 MiMo Token 计划 (新加坡) | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` |

环境变量和 `auth.json` 密钥的参考：[`const envMap`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/env-api-keys.ts) 在 [`packages/ai/src/env-api-keys.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/env-api-keys.ts) 中。

#### 认证文件

将凭据存储在 `~/.pi/agent/auth.json` 中：

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
  "qwen-token-plan":  { "type": "api_key", "key": "sk-sp-..." },
  "qwen-token-plan-individual": { "type": "api_key", "key": "sk-sp-..." },
  "qwen-token-plan-cn": { "type": "api_key", "key": "sk-sp-..." },
  "xiaomi": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-cn":  { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-ams": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-sgp": { "type": "api_key", "key": "..." }
}
```

`qwen-token-plan-individual` 使用与 
`qwen-token-plan` 相同的国际端点和 `QWEN_TOKEN_PLAN_API_KEY`，但将选择器限制为个人订阅文档中记录的模型。现有的 
 提供商保留其更广泛的目录以保持向后兼容性。使用 `auth.json` 时，将 
 凭据存储在你选择的提供商下；环境变量由两个国际提供商共享。

该文件以 `0600` 权限创建 (仅用户读写)。认证文件凭据优先于环境变量。

API 密钥凭据还可以包含 provider-scoped 环境值。在解析凭据密钥、提供商/模型标头以及提供商配置（如 Cloudflare 账户 ID、Azure OpenAI 设置、Vertex 项目/位置、Bedrock 设置、`PI_CACHE_RETENTION` 和 `HTTP_PROXY`/`HTTPS_PROXY`）时，这些值会在进程环境变量之前使用。

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

当 pi 需要使用与项目 shell 环境不同的提供商设置时，请使用此选项。

### 密钥解析

`key` 字段支持命令执行、环境插值和字面量：

- **Shell 命令：** 开头的 `"!command"` 将整个值作为命令执行，并使用 stdout (在进程生命周期内缓存)
 ```json
  { "type": "api_key", "key": "!security find-generic-password -ws 'anthropic'" }
  { "type": "api_key", "key": "!op read 'op://vault/item/credential'" }
  ```
- **环境插值：** `"$ENV_VAR"` 或 `"${ENV_VAR}"` 使用命名变量的值。插值在较大的字面量内部有效。
 ```json
  { "type": "api_key", "key": "$MY_ANTHROPIC_KEY" }
  { "type": "api_key", "key": "${KEY_PREFIX}_${KEY_SUFFIX}" }
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR` 是字面文本。缺少环境变量会使值无法解析。
- **转义：** `"$"` 输出字面量 `"$"`；`"$!"` 输出字面量 `"!"` 而不触发命令执行。
 ```json
  { "type": "api_key", "key": "$literal-dollar-prefix" }
  { "type": "api_key", "key": "$!literal-bang-prefix" }
  ```
- **字面量值：** 直接使用。诸如 `MY_API_KEY` 之类的纯大写字符串是字面量；对于环境变量，请使用 `$MY_API_KEY`。
 ```json
  { "type": "api_key", "key": "sk-ant-..." }
  { "type": "api_key", "key": "public" }
  ```

OAuth 凭据也会在 `/login` 之后存储在此处，并自动管理。

## 云提供商｜ Cloud Providers

### Azure OpenAI｜ Azure 

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

### Amazon Bedrock ｜ Amazon Bedrock

使用 `/login amazon-bedrock` 存储 Bedrock API 密钥，或配置以下环境 AWS 凭据源之一：

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

还支持 ECS 任务角色 (`AWS_CONTAINER_CREDENTIALS_*`) 和 IRSA (`AWS_WEB_IDENTITY_TOKEN_FILE`)。

```bash
pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

对于 ID 包含可识别模型名称的 Claude 模型，提示词缓存会自动启用，包括 (基础模型和 system-defined 推理配置文件)。对于应用推理配置文件 (（其 ARN 不包含模型名称）)，设置 `AWS_BEDROCK_FORCE_CACHE=1` 以启用缓存点：

```bash
export AWS_BEDROCK_FORCE_CACHE=1
pi --provider amazon-bedrock --model arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/abc123
```

如果您连接到 Bedrock API 代理，可以使用以下环境变量：

```bash
# Set the URL for the Bedrock proxy (standard AWS SDK env var)
export AWS_ENDPOINT_URL_BEDROCK_RUNTIME=https://my.corp.proxy/bedrock

# Set if your proxy does not require authentication
export AWS_BEDROCK_SKIP_AUTH=1

# Set if your proxy only supports HTTP/1.1
export AWS_BEDROCK_FORCE_HTTP1=1
```

### Cloudflare AI Gateway ｜ Cloudflare AI Gateway

`CLOUDFLARE_API_KEY` 可以通过 `/login` 设置。账户 ID 和网关 slug 可以设置为环境变量，或放在 API 密钥凭据的 `env` 对象中（位于 `auth.json`）。

```bash
export CLOUDFLARE_API_KEY=...           # or use /login
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...        # create at dash.cloudflare.com → AI → AI Gateway
pi --provider cloudflare-ai-gateway --model "claude-sonnet-4-5"
```

通过 Cloudflare AI Gateway 路由到 OpenAI、Anthropic 和 Workers AI。Workers AI 使用统一 API (`/compat`) 和带前缀的模型 ID (`workers-ai/@cf/...`)。OpenAI 使用 OpenAI 直通路由 (`/openai`)，并使用原生 OpenAI 模型 ID ，例如 `gpt-5.1`。Anthropic 使用 Anthropic 直通路由 (`/anthropic`)，并使用原生 Anthropic 模型 ID ，例如 `claude-sonnet-4-5`。

AI Gateway 身份验证使用 `CLOUDFLARE_API_KEY` 作为 `cf-aig-authorization`。上游身份验证可以是以下之一：

| 模式 | 请求身份验证 | 上游身份验证 |
|------|--------------|---------------|
| Workers AI | 仅 Cloudflare 令牌 | Cloudflare 原生 |
| 统一计费 | 仅 Cloudflare 令牌 | Cloudflare 处理上游身份验证并扣除积分 |
| 存储的 BYOK | 仅 Cloudflare 令牌 | Cloudflare 注入存储在 AI Gateway 仪表板中的提供商密钥 |
| 内联 BYOK | Cloudflare 令牌加上上游 `Authorization` 请求头 | 请求提供上游提供商密钥 |

对于正常的 pi 使用，建议使用统一计费或存储的 BYOK。内联 BYOK 需要为 Cloudflare AI Gateway 提供商配置额外的上游 `Authorization` 请求头，例如通过 `models.json` 提供商/模型覆盖。

### Cloudflare Workers AI

`CLOUDFLARE_API_KEY` 可以通过 `/login` 设置。`CLOUDFLARE_ACCOUNT_ID` 可以设置为环境变量，或在 `auth.json` 中的 API 密钥凭据的 `env` 对象中设置。

```bash
export CLOUDFLARE_API_KEY=...           # or use /login
export CLOUDFLARE_ACCOUNT_ID=...
pi --provider cloudflare-workers-ai --model "@cf/moonshotai/kimi-k2.6"
```

Pi 自动为 [前缀缓存](https://developers.cloudflare.com/workers-ai/features/prompt-caching/) 折扣设置 `x-session-affinity`。

### Google Vertex AI

使用应用程序默认凭据：

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1
```

或者将 `GOOGLE_APPLICATION_CREDENTIALS` 设置为服务账户密钥文件。

## llama.cpp

Pi 支持 llama.cpp 路由器服务器。使用 `/login llama.cpp` 进行配置，使用 `/llama` 管理已加载的模型，并使用 `/model` 选择已加载的模型。

有关服务器设置、模型目录布局、环境变量和命令用法，请参阅 [llama.cpp](llama-cpp.md)。

## 自定义提供商

**通过 models.json：** 添加 Ollama、LM Studio、vLLM 或任何支持受支持的 API (OpenAI Completions、OpenAI Responses、Anthropic Messages、Google Generative AI) 的提供商。请参阅 [models.md](models.md)。

**通过扩展：** 对于需要自定义 API 实现或 OAuth 流程的提供商，请创建扩展。请参阅 [custom-provider.md](custom-provider.md) 和 [examples/extensions/custom-provider-gitlab-duo](../examples/extensions/custom-provider-gitlab-duo/)。

## 解析顺序

为提供商解析凭据时：

1. CLI `--api-key` 标志
2. `auth.json` 条目 (API 密钥或 OAuth 令牌)
3. 环境变量
4. 来自 `models.json` 的自定义提供商密钥
