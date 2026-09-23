# 选择模型｜ Choose a Model

对于 built-in 模型提供商，先使用 `/login`，然后用 `/model` 选择模型。仅当 Pi 尚未包含你需要的模型提供商或端点时，才使用自定义模型配置。

## 选择连接｜ Choose a connection

| 你的现有条件｜ What you have | 推荐设置｜ Recommended setup |
|---|---|
| 受支持的订阅｜ A supported subscription | 通过 `/login` 登录｜ Sign in through  |
| 模型提供商 API 密钥｜ A 模型提供商 key | 通过 `/login` 存储它，或设置其环境变量｜ Store it through or set its environment variable |
| 本地 GGUF 模型｜ A local model | 将 Pi 连接到 llama.cpp 路由器｜ Connect to the router |
| 兼容 OpenAI、Anthropic 或 Google 的端点｜ An -, Anthropic-, or Google-compatible endpoint | 将其添加到 `models.json`｜ Add it to  |
| 使用自定义协议或身份验证流程的模型提供商｜ A 模型提供商 with a custom protocol or authentication flow | 构建或安装模型提供商扩展｜ Build or install a 模型提供商 扩展 |

浏览 [模型目录](https://pi.dev/models)，了解当前的模型提供商、模型 ID、能力、上下文限制和定价。Pi 启动时使用其内置目录，并可从 pi.dev 叠加更新的目录数据。缓存的目录数据在离线状态下仍可用；运行 `pi update --models` 可强制刷新。

## 身份验证｜ Authenticate

运行 `/login` 并选择一个模型提供商。Pi 将凭据存储在 [`auth.json`](configuration.md#agent-directory) 中。运行 `/logout` 可移除某个模型提供商的已存储凭据。

你也可以通过模型提供商的环境变量提供 API 密钥。这在 CI 以及其他不应让 Pi 写入凭据的环境中很有用。[模型提供商身份验证](providers.md) 列出了这些变量以及 cloud-provider 设置。

当配置了多个凭据来源时，Pi 会优先使用运行时 `--api-key`，然后是已存储的 `auth.json` 凭据、来自 `models.json` 的 `apiKey`，最后是模型提供商的环境变量或环境云凭据。模型提供商扩展可以定义自己的身份验证行为。

请对 `auth.json` 及任何凭据命令保密。在你信任某个项目后，项目设置和扩展可以在 Pi 进程内执行。在从不受信任的目录加载配置之前，请先查看 [安全](security.md)。

## 选择模型｜ Select a model

运行 `/model` 以搜索可用模型。选择器会显示其模型提供商具有可用身份验证的模型。在某个模型上按 `Ctrl+S`，可将其保存为新会话的默认模型。

运行 `/thinking` 以选择当前模型的思考级别。在此处按 `Ctrl+S` 可保存启动级别。Pi 会将选项限制为所选模型支持的级别。

`Ctrl+P` 会在可用模型之间循环切换。使用 `/scoped-models` 控制该循环并保存选择，或通过 [设置](settings.md#model-cycling) 配置模型模式。

会话会记录模型和 thinking-level 的变更。恢复会话时会还原这些变更，但不会更改新会话的默认值。

## 连接本地模型｜ Connect local models

Pi 直接与 llama.cpp 路由器集成。路由器会发现 GGUF 文件并按需加载模型。Pi 的 `/llama` 命令用于管理路由器，而 `/model` 则选择其已加载的某个模型。

请参阅 [Local Models with llama.cpp](llama-cpp.md)，了解服务器启动、模型布局、下载以及连接故障排除。

对于 Ollama、LM Studio、vLLM、SGLang 以及其他兼容服务器，请在 `models.json` 中[配置兼容端点](#configure-a-compatible-endpoint)。

## 配置兼容端点｜ Configure a compatible endpoint

当某个端点使用 Pi 已支持的 API 时，请使用 [`models.json`](configuration.md#agent-directory)。这包括大多数 Ollama、LM Studio、vLLM、SGLang 和代理部署。

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

虚拟密钥使模型可供 Pi 使用； Ollama 会忽略它。对于需要身份验证的端点，`apiKey` 和标头值可以使用 `$NAME` 或 `${NAME}` 环境变量插值、字面值，或前导 `!command`。`models.json` 中的命令在请求时运行，且不会被 Pi 缓存。

打开 `/model` 会重新加载该文件。`models` 条目会在该提供商上添加或替换具有相同 ID 的模型。使用 `modelOverrides` 可更改现有 built-in 或 extension-provided 模型的元数据，而不会替换提供商的模型列表。未知的覆盖 ID 会被忽略。

### 描述模型输入和缓存｜ Describe model input and caching

使用 `inputLimits.images.resize` 控制 Pi 在将新图像附件、`read` 结果和 tool-result 图像存储到对话历史记录之前如何对其进行编码：

```json
{
  "id": "vision-model",
  "input": ["text", "image"],
  "inputLimits": {
    "images": {
      "resize": {
        "maxWidth": 1568,
        "maxHeight": 1568,
        "maxBytes": 524288,
        "jpegQuality": 75
      }
    }
  }
}
```

`maxBytes` 限制 base64 编码后的负载。省略的缩放字段使用保守默认值： 2000 x 2000 像素、编码后 4.5 MiB，以及 JPEG 质量 80。图像只编码一次；更改模型不会重写历史图像。目录还可以通过 `inputLimits.maxRequestBytes`、`images.maxPerMessage` 和 `images.maxPerRequest` 描述硬性请求限制，但 Pi 尚未根据这些限制重写或拒绝历史记录。

<a id="prompt-cache-lifetimes"></a>

使用 `promptCache` 声明提供商在 `short` 或 `long` 保留层级下的 best-effort 缓存生存时间（以秒为单位）：

```json
{ "id": "claude-sonnet-5", "promptCache": { "short": 300, "long": 3600 } }
```

在任何已发布范围中选择保守的一端。对于当前活动层级没有生存时间的模型，不符合缓存预热条件。`modelOverrides` 条目可以为 built-in 或扩展模型设置 `inputLimits` 或 `promptCache`，包括通过已验证代理访问的模型。请参阅 [`cacheWarming`](settings.md#model-and-thinking)。

兼容性设置应描述端点请求或响应行为中已验证的差异。不要仅因为端点宣称兼容 OpenAI 或 Anthropic 就启用它们。

## 添加自定义提供商｜ Add a custom 模型提供商

当提供商需要自定义流式传输、模型发现或身份验证行为时，请使用扩展。有关扩展工作流，请参阅 [Custom Providers](custom-provider.md)。

## 故障排除｜ Troubleshooting

### 模型未出现｜ A model does not appear

确认其提供商具有可用的身份验证。自定义模型可以从 `models.json` 加载，但在 Pi 能够解析凭据之前，它们在 `/model` 中仍不可用。对于 llama.cpp，只会显示路由器当前已加载的模型。

### 身份验证仅在一个 shell 中有效｜ Authentication works in one shell only

检查该密钥是否来自环境变量，而不是 `auth.json`。环境变量必须存在于启动 Pi 的进程中。

### 登录会在远程机器上打开浏览器｜ Sign-in opens a browser on a remote machine

在可用时完成模型提供商的无头认证流程。某些模型提供商允许你将最终重定向 URL 或授权码粘贴回 Pi。请参阅 [交互式认证](providers.md#authenticate-interactively)。

### 兼容端点拒绝请求｜ A compatible endpoint rejects requests

在 `models.json` 中检查其 API 类型和兼容性设置。上游服务器必须支持相应的请求字段和行为。
