# 使用 llama.cpp 的本地模型

Pi 支持 [llama.cpp](https://github.com/ggml-org/llama.cpp) 路由器服务器。该路由器会发现多个 GGUF 模型，并按需加载或卸载它们。

使用支持路由器的当前 llama.cpp 构建版本。按照 [构建说明](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md) 操作，或为你的平台安装 [预构建版本](https://github.com/ggml-org/llama.cpp/releases)。

## 启动路由器｜ Start the router

启动 `llama-server` 时不要传入 `--model` 或 `-m`。传入模型会启动 single-model 模式，而不是路由器模式。

```bash
llama-server \
  --models-dir ~/models \
  --no-models-autoload \
  --jinja \
  --host 127.0.0.1 \
  --port 8080 \
  -ngl 999 \
  -c 32768
```

重要选项：

- `--models-dir ~/models` 会发现本地 GGUF 文件。
- `--no-models-autoload` 通过 `/llama` 保持显式加载。
- `--jinja` 启用兼容的聊天模板和工具调用。
- `-ngl 999` 将尽可能多的层卸载到 GPU。
- `-c 32768` 设置每个已加载模型的上下文窗口。省略它会使用模型的原生上下文，这可能需要多得多的内存。

single-file 模型可以直接放在模型目录中。将多模态模型和 multi-shard 模型放在单独的子目录中：

```text
~/models/
├── llama-3.2-1b-Q4_K_M.gguf
├── gemma-3-4b-it-Q4_K_M/
│   ├── gemma-3-4b-it-Q4_K_M.gguf
│   └── mmproj-F16.gguf
└── large-model-Q4_K_M/
    ├── large-model-Q4_K_M-00001-of-00003.gguf
    ├── large-model-Q4_K_M-00002-of-00003.gguf
    └── large-model-Q4_K_M-00003-of-00003.gguf
```

手动添加文件后重启路由器。有关 per-model 上下文大小和其他选项，请使用 [llama.cpp 模型预设](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md#model-presets)。

## 配置 Pi

启动 Pi 并配置模型提供商：

```text
/login llama.cpp
```

输入路由器 URL 和可选的 API 密钥。默认 URL 为 `http://127.0.0.1:8080`。

如果使用 `--no-models-autoload` 启动路由器，`/login llama.cpp` 仅存储连接。运行 `/llama` 加载模型，然后运行 `/model` 为当前会话选择已加载的模型。

环境变量可以在不使用 `/login` 的情况下配置相同的值：

```bash
export LLAMA_BASE_URL=http://127.0.0.1:8080
export LLAMA_API_KEY=optional-secret
pi
```

如果服务器使用 API 密钥，请使用匹配的 `--api-key` 值启动 `llama-server`。保留 `--host 127.0.0.1` 以访问 local-only。

## 管理模型｜ Manage models

运行：

```text
/llama
```

- 选择一个未加载的模型以加载它。
- 选择一个已加载的模型以卸载它。
- 选择 **下载模型…**，搜索 Hugging Face ，然后选择一个仓库和量化。精确的 `owner/repository[:quant]` 值也可以使用。
- 在加载或下载过程中按 Escape 以确认取消。

Hugging Face 搜索在设置时使用 `HF_TOKEN`，然后检查 `$HF_TOKEN_PATH`、`$HF_HOME/token`、`$XDG_CACHE_HOME/huggingface/token` 和 `~/.cache/huggingface/token`。搜索在未经身份验证的情况下也可以使用，但速率限制较低。Pi 在下载受限仓库之前会发出警告，并链接到其访问页面。llama.cpp 服务器执行下载，因此当所选仓库需要访问权限时，其进程也必须具有 `HF_TOKEN`。

如果已加载其他模型，Pi 会询问是先卸载它们还是保留它们。Pi 不会静默卸载模型，也绝不会删除模型文件。路由器可能与其他客户端共享，因此 `/llama` 始终显示路由器的当前状态。

已加载和休眠的模型会出现在 `/model` 中。休眠的模型在被选中时会自动唤醒。启用路由器自动加载后，未加载的预设模型也会出现，并在被选中时加载。使用 `--no-models-autoload` 时，请先通过 `/llama` 加载模型，然后再选择它。

如果路由器断开连接，`/llama` 会显示 **重试** 和 **关闭**。重试会重新连接并刷新模型状态，而不会重放被中断的操作。

## 故障排除｜ Troubleshooting

检查路由器是否可访问：

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/models
```

- **`/llama` 中没有模型：** 检查 `--models-dir`、目录布局，并重启路由器。
- **模型在 `/model` 中缺失，且带有 `--no-models-autoload`：** 请先使用 `/llama` 加载它。
- **加载失败或占用过多内存：** 降低 `-c` 或卸载另一个模型。
- **服务器未处于路由器模式：** 在不使用 `--model`、`-m` 或 `-hf` 的情况下启动它。
