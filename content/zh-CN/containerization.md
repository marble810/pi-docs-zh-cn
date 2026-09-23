# 在隔离环境中运行 Pi

使用隔离环境来限制生成的命令可以访问或影响的文件、凭据、进程和网络服务。

你可以隔离完整的 Pi 进程，或者将 Pi 保留在主机上，并将选定的工具路由到隔离环境中。

## 选择隔离方法｜ Choose an isolation method

| 方法 | Pi 运行位置 | 隔离内容 | 凭据处理 | 最适合 |
|---|---|---|---|---|
| 纯 Docker | 容器 | Pi、built-in 工具、`!` 命令和扩展 | 传入容器的凭据 | 简单的本地容器边界 |
| Docker 沙箱 | 托管沙箱 | Pi、built-in 工具、`!` 命令和扩展 | 模型提供商凭据保留在主机上，并由代理替换 | 托管的本地隔离，且不暴露真实的模型提供商密钥 |
| OpenShell | 本地或远程沙箱 | Pi、built-in 工具、`!` 命令和扩展 | 策略控制的凭据和推理路由 | 文件系统、进程、网络和凭据策略 |
| Gondolin 扩展 | 主机 | 内置工具和 `!` 命令 | 存储的 Pi 凭据保留在主机上，但命令会继承主机环境变量 | 用于工具执行的本地微型虚拟机，同时保留主机接口 |

该方法会改变扩展的运行位置。当完整的 Pi 进程在隔离环境中运行时，其扩展也在那里运行。当主机 Pi 通过 Gondolin 委托 built-in 工具时，其他扩展工具仍会在主机上运行，除非它们也委托自己的工作。

## 决定 Pi 可以访问什么

隔离的进程仍然可以影响你向它暴露的资源：

- read-write 主机挂载允许 Pi 修改这些主机文件。
- 挂载 `~/.pi/agent` 会暴露你的 Pi 凭据、设置、扩展和会话。
- 传入容器的环境变量可供容器内的进程使用。
- 网络访问可能允许代码或工具输出离开该环境。
- 仅工具隔离不会约束主机 Pi 进程或不使用隔离后端的扩展工具。

仅暴露任务所需的工作文件夹、凭据和网络目标。当你不希望写入影响主机时，使用 read-only 挂载或将文件复制进和复制出该环境。

## 在普通 Docker 中运行 Pi｜ Run in plain Docker

普通 Docker 提供最简单的 whole-process 容器边界。

### 构建镜像｜ Build the image

创建 `Dockerfile.pi`：

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

从包含该文件的目录构建它：

```bash
docker build -t pi-sandbox -f Dockerfile.pi .
```

### 启动 Pi｜ Start 

从你希望 Pi 访问的工作文件夹中，运行：

```bash
docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

将 `ANTHROPIC_API_KEY` 替换为你的模型提供商所需的凭据。命名的 `pi-agent-home` 卷会在多次运行之间保留 container-local 设置、凭据和会话。

不要挂载主机的 `~/.pi/agent`，除非该容器应当访问你的主机 Pi 配置和凭据。

### 验证工作区｜ Verify the workspace

在 Pi 内，运行：

```text
!pwd
```

该命令应报告 `/workspace`。`/workspace` 下的更改会写入到挂载的主机文件夹。当这不可接受时，移除绑定挂载或使用 read-only 挂载。

## 使用 Docker Sandboxes 运行 Pi｜ Run with Docker Sandboxes

[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) 在受管理的沙箱内运行完整的 Pi 进程。其代理可以将真实的模型提供商凭据保留在主机上，并在请求离开沙箱时替换它。

在创建沙箱之前配置凭据。不要在沙箱内运行 `/login`，因为那会将真实凭据写入其中。

### 使用 Claude Pro 或 Max 令牌｜ Use a Claude Pro or Max token

在装有 Claude Code 的机器上使用 `claude setup-token` 生成令牌。如果已配置 `anthropic` 密钥，请先移除它，以免代理在 bearer 令牌之外再添加 API 密钥标头：

```bash
sbx secret rm anthropic

sbx secret set-custom \
  --host api.anthropic.com \
  --env ANTHROPIC_OAUTH_TOKEN \
  --placeholder 'sk-ant-oat01-{rand}'
```

`sbx secret set-custom` 从标准输入读取真实令牌。沙箱会收到一个 OAuth 形式的占位符，代理仅对发往已配置主机的请求替换它。

对于 Anthropic API 密钥，请改用 `sbx secret set anthropic`。

### 启动 Pi

在你想挂载的工作文件夹中运行此命令：

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

对于现有沙箱，使用以下命令运行 Pi non-interactively：

```bash
sbx exec <sandbox-name> -- pi -p "list the failing tests"
```

有关其他模型提供商、故障排除和镜像固定，请参阅 [Pi 工具包文档](https://github.com/docker/sbx-kits-contrib/tree/main/pi)。

## 使用 OpenShell 运行 Pi

[NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview) 提供本地或远程沙箱，并具备文件系统、进程、网络、凭据和推理策略。

### 选择网关

每个沙箱都需要一个活动网关：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

### 创建沙箱

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

Pi、其 built-in 工具、`!` 命令和扩展工具都在 OpenShell 边界内运行。

### 将文件传输到远程沙箱

远程网关不会 bind-mount 你的主机工作文件夹。请在沙箱内克隆仓库，或显式传输文件：

```bash
openshell sandbox upload pi-sandbox ./working-folder /workspace
openshell sandbox download pi-sandbox /workspace/working-folder ./working-folder-out
```

OpenShell 推理路由可以将原始模型凭据保留在沙箱之外。配置后，将 Pi 指向网关暴露的相应 OpenAI 兼容或 Anthropic 兼容端点。

## 通过 Gondolin 路由工具

[Gondolin](https://github.com/earendil-works/gondolin) 是一个本地 Linux 微型虚拟机。其示例扩展将 Pi 进程和 file-based 模型提供商凭据保留在主机上，同时将 built-in 工具和用户 `!` 命令路由到虚拟机中。

虚拟机内的命令会继承主机进程环境。因此，通过环境变量提供的模型提供商密钥可能会在虚拟机内可见。除非你移除敏感变量或更改扩展的环境处理方式，否则不要将此模式用作凭据边界。

Gondolin 需要 Node.js 23.6 或更高版本，以及通过你的 operating-system 包管理器安装的 QEMU。

### 安装扩展

在 Pi source checkout 中：

```bash
mkdir -p ~/.pi/agent/extensions
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

### 启动 Pi

在你想挂载的工作文件夹中运行 Pi：

```bash
cd /path/to/working-folder
pi -e ~/.pi/agent/extensions/gondolin
```

该扩展将主机工作文件夹挂载到虚拟机中的 `/workspace`，并覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find` 和 `ls`。`/workspace` 下的文件更改会写回主机。

其他扩展工具仍在主机上运行，除非它们显式委托其操作。在添加可能绕过虚拟机边界的工具之前，请查看 [Gondolin 示例](../examples/extensions/gondolin/)。
