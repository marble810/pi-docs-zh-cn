# 模型提供商身份验证｜模型提供商 Authentication

大多数托管模型提供商支持以下一种或两种身份验证方法：

- 通过由 OAuth 支持的浏览器或设备流程登录。
- 提供 API 密钥。

使用 `/login [provider]` 查看某个模型提供商支持的方法。Amazon Bedrock 和 Google Vertex AI 也可以使用环境云凭证。

## 交互式认证｜ Authenticate interactively

运行 `/login` 并选择一个模型提供商。Pi 会引导你完成其 OAuth 或 API 密钥流程，并将生成的凭证保存到 [`auth.json`](configuration.md#agent-directory)。

在远程或无头机器上， OAuth 回调可能无法到达本地进程。出现提示时，将最终的 redirect URL 或授权码粘贴回 Pi。

运行 `/logout` 并选择一个模型提供商，以移除其存储的凭证。这不会取消设置环境变量、从 `models.json` 中移除认证，也不会在模型提供商处撤销该凭证。

`auth.json` 可能包含 API 密钥和 OAuth 令牌。请将其保密，不要提交。

Radius 认证使用其网关目录，并缓存刷新后的模型元数据，以便之后离线启动。在 `models.json` 中配置的自定义 Radius 网关使用其自己的目录，而不会继承公共 `radius.pi.dev` 目录。

## 使用环境中的 API 密钥｜ Use an API key from the environment

环境变量在 CI 以及任何 Pi 不应存储密钥的场景中都很有用。在启动 Pi 之前设置该变量：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

此表涵盖具有单个主 API 密钥变量的模型提供商。需要额外配置或支持环境云凭证的模型提供商在 [Cloud providers](#cloud-providers) 下介绍。

| 模型提供商 | 环境变量 |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| Ant Ling | `ANT_LING_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |
| ZAI Coding Plan (Global) | `ZAI_API_KEY` |
| ZAI Coding Plan (China) | `ZAI_CODING_CN_API_KEY` |
| OpenCode Zen and Go | `OPENCODE_API_KEY` |
| Radius | `RADIUS_API_KEY` |
| Hugging Face | `HF_TOKEN` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Baseten | `BASETEN_API_KEY` |
| Kimi For Coding | `KIMI_API_KEY` |
| Meta | `META_API_KEY` |
| MiniMax | `MINIMAX_API_KEY` |
| MiniMax (中国) | `MINIMAX_CN_API_KEY` |
| Moonshot AI (全球与中国) | `MOONSHOT_API_KEY` |
| Qwen Token Plan 与 Individual | `QWEN_TOKEN_PLAN_API_KEY` |
| Qwen Token Plan (中国) | `QWEN_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo | `XIAOMI_API_KEY` |
| Xiaomi MiMo Token Plan (中国) | `XIAOMI_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo Token Plan (Amsterdam) | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` |
| Xiaomi MiMo Token Plan (Singapore) | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` |

Anthropic 还会将 `ANTHROPIC_OAUTH_TOKEN` 识别为 API 凭据，并将 `ANTHROPIC_AUTH_TOKEN` 识别为 bearer 认证。

## 从命令加载 API 密钥

若要在不将解析后的密钥写入磁盘的情况下使用密钥管理器，请将 `auth.json` 中模型提供商的 `key` 设置为以 `!` 为前缀的命令：

```json
{
  "anthropic": {
    "type": "api_key",
    "key": "!security find-generic-password -ws 'anthropic'"
  }
}
```

Pi 在首次需要密钥时运行该命令，并在进程生命周期内缓存其标准输出。输出为空、超时或退出码非零时，密钥将保持未解析状态，直到 Pi 重启。

## 云模型提供商｜ Cloud Providers

以下模型提供商需要额外设置，或可以使用其云平台提供的凭据。

存储的 API 密钥凭据可以包含一个 `env` 对象。对于该模型提供商，其值优先于进程环境：

```json
{
  "cloudflare-workers-ai": {
    "type": "api_key",
    "key": "...",
    "env": {
      "CLOUDFLARE_ACCOUNT_ID": "account-id"
    }
  }
}
```

### Azure OpenAI

设置 API 密钥，以及基础 URL 或资源名称：

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# Or:
export AZURE_OPENAI_RESOURCE_NAME=your-resource
```

`ai.azure.com`、`cognitiveservices.azure.com` 和 `openai.azure.com` 下的资源根 URL 会被规范化为 OpenAI API 路径。

### Amazon Bedrock

Bedrock 可以使用 bearer 令牌或环境中的 AWS 凭据来源：

```bash
# Named profile
export AWS_PROFILE=your-profile

# IAM keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
# Required for temporary credentials
export AWS_SESSION_TOKEN=...

# Bedrock bearer token
export AWS_BEARER_TOKEN_BEDROCK=...

# Region, when not supplied by the profile or AWS SDK configuration
export AWS_REGION=us-west-2
# AWS_DEFAULT_REGION is also supported
```

Pi 还通过标准的 `AWS_CONTAINER_CREDENTIALS_*` 和 `AWS_WEB_IDENTITY_TOKEN_FILE` 变量支持 ECS 任务凭据和 IRSA。

### Cloudflare AI Gateway

该网关需要令牌、账户 ID 和网关 ID ：

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...
```

账户 ID 和网关 ID 可以来自进程环境，也可以来自 `auth.json` 中凭据的 `env` 对象。

`CLOUDFLARE_API_KEY` 将 Pi 认证到该网关。上游访问可以使用 Cloudflare 统一计费、存储在网关中的凭据，或在 `models.json` 中为该模型提供商配置的 `Authorization` 标头。

### Cloudflare Workers AI

Workers AI 需要令牌和账户 ID ：

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
```

账户 ID 也可以存储在凭证的 `env` 对象中。

### Google Vertex AI ｜ Google Vertex AI

使用 Google Cloud API 密钥：

```bash
export GOOGLE_CLOUD_API_KEY=...
```

要使用应用默认凭证，请配置项目和位置：

```bash
export GOOGLE_CLOUD_PROJECT=your-project
# GCLOUD_PROJECT is also supported
export GOOGLE_CLOUD_LOCATION=us-central1
```

然后进行身份验证：

```bash
gcloud auth application-default login
```

若要改用 service-account 密钥文件，请设置 `GOOGLE_APPLICATION_CREDENTIALS` 以及项目和位置。
