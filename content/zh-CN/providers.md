# 模型提供商

Pi 支持通过 OAuth 的 subscription-based 提供商，以及通过环境变量或认证文件的 API 密钥提供商。内置目录随 pi 提供；配置的提供商可以刷新较新的目录并将其缓存到 `~/.pi/agent/models-store.json` 中以供离线使用。

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
- OpenRouter (通过 OAuth 生成的 API 密钥，从 OpenRouter 积分中计费)
- Radius

使用 `/logout` 清除凭据。令牌存储在 `~/.pi/agent/auth.json` 中，过期时由 auto-refresh 处理。OpenRouter 则会生成一个不会自动过期的 user-controlled API 密钥。

### OpenAI Codex

- 需要 ChatGPT Plus 或 Pro 订阅
- 由 OpenAI 官方认可：[Codex for OSS](https://developers.openai.com/community/codex-for-oss)

### Claude Pro/Max

Anthropic 订阅认证适用于 Claude Pro/Max 账户。第三方代理运行框架使用量会从 [额外使用量](https://claude.ai/settings/usage) 中扣除，并按 token 计费，不计入 Claude 计划限额。

### GitHub Copilot

- 按 Enter 使用 github.com，或输入你的 GitHub Enterprise Server 域名
- 如果出现“model not supported”，请在 VS Code 中启用： Copilot Chat → 模型选择器 → 选择模型 → “启用”

### xAI (Grok/X subscription)

- 运行 `/login xai`，然后选择 **使用订阅**
- `XAI_API_KEY` 仍可通过 **使用 API 密钥** 使用

### OpenRouter

- 运行 `/login openrouter`，然后选择 **使用 OpenRouter 登录** 以打开 OpenRouter PKCE 授权流程
- 该授权会创建一个 user-controlled OpenRouter API 密钥，从你的 OpenRouter 积分中扣费
- 在远程/无头机器上 (e.g。通过 SSH) 浏览器无法访问回环回调；请将最终的重定向 URL (或授权码) 粘贴到登录提示中
- `OPENROUTER_API_KEY` 仍可通过 **使用 API 密钥** 使用

### Radius

Radius 是一个动态的 `pi-messages` 网关。`/login radius` 将 OAuth token 存储在 `auth.json` 中；网关目录独立刷新并缓存到 `models-store.json`。自定义 Radius 网关可以在 `models.json` 中使用 `"oauth": "radius"` 和网关 `baseUrl` 声明。

## API 密钥

### 环境变量或认证文件

以交互模式使用 `/login`，选择一个模型提供商将 API 密钥存储到 `auth.json`，或通过环境变量设置凭据：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

| 模型提供商 | 环境变量 | `auth.json` 密钥 |
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
| ZAI Coding Plan (全局) | `ZAI_API_KEY` | `zai` |
| ZAI 编码计划 (中国) | `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` |
| OpenCode Zen | `OPENCODE_API_KEY` | `opencode` |
| OpenCode Go | `OPENCODE_API_KEY` | `opencode-go` |
| Radius | `RADIUS_API_KEY` | `radius` |
| Hugging Face | `HF_TOKEN` | `huggingface` |
| Fireworks | `FIREWORKS_API_KEY` | `fireworks` |
| Together AI | `TOGETHER_API_KEY` | `together` |
| Kimi For Coding | `KIMI_API_KEY` | `kimi-coding` |
| MiniMax | `MINIMAX_API_KEY` | `minimax` |
| MiniMax (中国) | `MINIMAX_CN_API_KEY` | `minimax-cn` |
| Qwen Token Plan | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan` |
| Qwen Token Plan (中国) | `QWEN_TOKEN_PLAN_CN_API_KEY` | `qwen-token-plan-cn` |
| Xiaomi MiMo | `XIAOMI_API_KEY` | `xiaomi` |
| Xiaomi MiMo Token Plan (中国) | `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` |
| Xiaomi MiMo Token Plan (阿姆斯特丹) | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` |
| Xiaomi MiMo Token Plan (新加坡) | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` |

关于环境变量和`auth.json`密钥的参考：[`const envMap`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/env-api-keys.ts)位于[`packages/ai/src/env-api-keys.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/env-api-keys.ts)。

#### 认证文件

将凭据存储在`~/.pi/agent/auth.json`中：

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
  "qwen-token-plan-cn": { "type": "api_key", "key": "sk-sp-..." },
  "xiaomi": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-cn":  { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-ams": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-sgp": { "type": "api_key", "key": "..." }
}
```

该文件使用`0600`权限创建，(仅用户读写)。认证文件凭据优先于环境变量。

API密钥凭据还可以包括provider-scoped环境值。在解析凭据密钥、提供者/模型标头以及提供者配置（如 Cloudflare 账户 ID、Azure OpenAI设置、Vertex 项目/位置、Bedrock 设置、`PI_CACHE_RETENTION`和`HTTP_PROXY`/`HTTPS_PROXY`）时，这些值优先于进程环境变量。

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

当 Pi 需要使用与项目 Shell 环境不同的提供者设置时，请使用此选项。

### 密钥解析

`key`字段支持命令执行、环境变量插值和字面量：

- **Shell 命令：**以`"!command"`开头的值作为命令执行，并使用标准输出，(缓存用于进程生命周期)
 ```json
  { "type": "api_key", "key": "!security find-generic-password -ws 'anthropic'" }
  { "type": "api_key", "key": "!op read 'op://vault/item/credential'" }
  ```
- **环境变量插值：** `"$ENV_VAR"`或`"${ENV_VAR}"`使用命名变量的值。插值在较大的字面量内工作。
 ```json
  { "type": "api_key", "key": "$MY_ANTHROPIC_KEY" }
  { "type": "api_key", "key": "${KEY_PREFIX}_${KEY_SUFFIX}" }
  ```
  `$FOO_BAR` is the variable `FOO_BAR`; use `${FOO}_BAR` when `BAR`是字面文本。缺少环境变量会使值无法解析。
- **转义：** `"$"`输出一个字面量`"$"`；`"$!"`输出一个字面量`"!"`而不触发命令执行。
 ```json
  { "type": "api_key", "key": "$literal-dollar-prefix" }
  { "type": "api_key", "key": "$!literal-bang-prefix" }
  ```
- **字面值：**直接使用。纯大写字符串如`MY_API_KEY`是字面量；对于环境变量，请使用`$MY_API_KEY`。
 ```json
  { "type": "api_key", "key": "sk-ant-..." }
  { "type": "api_key", "key": "public" }
  ```

OAuth 凭据在`/login`之后也存储在此处，并自动管理。

## 云提供商

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

使用`/login amazon-bedrock`存储 Bedrock API密钥，或配置以下环境AWS凭据源之一：

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

还支持ECS任务角色(`AWS_CONTAINER_CREDENTIALS_*`)和IRSA(`AWS_WEB_IDENTITY_TOKEN_FILE`)。

```bash
pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

对于 ID 包含可识别模型名称的 Claude 模型，(基础模型和system-defined推理配置文件)会自动启用提示缓存。对于应用程序推理配置文件(其 ARN 不包含模型名称)，请设置`AWS_BEDROCK_FORCE_CACHE=1`以启用缓存点：

```bash
export AWS_BEDROCK_FORCE_CACHE=1
pi --provider amazon-bedrock --model arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/abc123
```

如果您连接到 Bedrock API代理，可以使用以下环境变量：

```bash
# Set the URL for the Bedrock proxy (standard AWS SDK env var)
export AWS_ENDPOINT_URL_BEDROCK_RUNTIME=https://my.corp.proxy/bedrock

# Set if your proxy does not require authentication
export AWS_BEDROCK_SKIP_AUTH=1

# Set if your proxy only supports HTTP/1.1
export AWS_BEDROCK_FORCE_HTTP1=1
```

### Cloudflare AI Gateway

`CLOUDFLARE_API_KEY`可以通过`/login`设置。账户 ID 和网关 slug 可以设置为环境变量，或在`auth.json`中API密钥凭据的`env`对象中设置。

```bash
export CLOUDFLARE_API_KEY=...           # or use /login
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...        # create at dash.cloudflare.com → AI → AI Gateway
pi --provider cloudflare-ai-gateway --model "claude-sonnet-4-5"
```

通过 Cloudflare AI Gateway 连接到 OpenAI、Anthropic 和 Workers AI。Workers AI 使用统一的 API (`/compat`) 和带前缀的模型 ID (`workers-ai/@cf/...`)。OpenAI 使用 OpenAI 透传路由 (`/openai`) 和原生 OpenAI 模型 ID （如 `gpt-5.1`）。Anthropic 使用 Anthropic 透传路由 (`/anthropic`) 和原生 Anthropic 模型 ID （如 `claude-sonnet-4-5`）。

AI Gateway 身份验证使用 `CLOUDFLARE_API_KEY` 作为 `cf-aig-authorization`。上游身份验证可以是以下之一：

| 模式 | 请求认证 | 上游认证 |
|------|--------------|---------------|
| Workers AI | 仅 Cloudflare 令牌 | Cloudflare 原生 |
| 统一计费 | 仅 Cloudflare 令牌 | Cloudflare 处理上游认证并扣除额度 |
| 存储的 BYOK | 仅 Cloudflare 令牌 | Cloudflare 注入存储在 AI Gateway 仪表盘中的提供商密钥 |
| 内联 BYOK | Cloudflare 令牌加上上游 `Authorization` 标头 | 请求提供上游提供商密钥 |

对于正常使用，建议使用统一计费或存储的 BYOK。内联 BYOK 需要为 Cloudflare AI Gateway 提供商配置额外的上游 `Authorization` 标头，例如通过 `models.json` 提供商/模型覆盖。

### Cloudflare Workers AI ｜ Cloudflare Workers AI

`CLOUDFLARE_API_KEY` 可以通过 `/login` 设置。`CLOUDFLARE_ACCOUNT_ID` 可以设置为环境变量，或在 `auth.json` 的 API 密钥凭证的 `env` 对象中设置。

```bash
export CLOUDFLARE_API_KEY=...           # or use /login
export CLOUDFLARE_ACCOUNT_ID=...
pi --provider cloudflare-workers-ai --model "@cf/moonshotai/kimi-k2.6"
```

Pi 自动设置 `x-session-affinity` 以便享受 [前缀缓存](https://developers.cloudflare.com/workers-ai/features/prompt-caching/) 折扣。

### Google Vertex AI ｜ Google Vertex AI

使用应用默认凭据：

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1
```

或者将 `GOOGLE_APPLICATION_CREDENTIALS` 设置为服务账户密钥文件。

## llama.cpp

Pi 支持 llama.cpp 路由器服务器。使用 `/login llama.cpp` 进行配置，使用 `/llama` 管理已加载的模型，使用 `/model` 选择已加载的模型。

有关服务器设置、模型目录布局、环境变量和命令用法，请参阅 [llama.cpp](llama-cpp.md)。

## 自定义模型提供商｜ Custom Providers

**通过 models.json：** 添加 Ollama、LM Studio、vLLM 或任何支持 API (OpenAI Completions、OpenAI Responses、Anthropic Messages、Google Generative AI) 的提供商。请参阅 [models.md](models.md)。

**通过扩展：** 对于需要自定义 API 实现或 OAuth 流程的提供商，请创建一个扩展。请参阅 [custom-provider.md](custom-provider.md) 和 [examples/extensions/custom-provider-gitlab-duo](../examples/extensions/custom-provider-gitlab-duo/)。

## 解析顺序｜ Resolution Order

解析提供商的凭据时：

1. CLI `--api-key` 标志
2. `auth.json` 条目 (API 密钥或 OAuth 令牌)
3. 环境变量
4. 来自 `models.json` 的自定义提供商密钥
