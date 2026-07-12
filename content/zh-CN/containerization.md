# 容器化

Pi 默认以所有权限运行，但在某些情况下，您可能希望对 Pi 可以写入哪些目录以及拥有哪些访问权限进行更多控制。

通常有两种选择。您可以

1. 在隔离环境中运行整个 `pi` 进程，或者
2. 在主机上运行 `pi`，并将工具执行路由到隔离环境中。

## 选择一种模式

| 模式          | 隔离的内容                                | 最适合                                     | 备注                                                                       |
| ------------- | ----------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| Gondolin 扩展 | 内置工具和 `!` 命令                       | 本地微虚拟机隔离，同时在主机上保留身份验证 | 参见 [`examples/extensions/gondolin/`](../examples/extensions/gondolin/)。 |
| 普通 Docker   | 整个 `pi` 进程在本地容器中                | 简单的本地隔离                             | 模型提供商 API 密钥会进入容器。                                            |
| OpenShell     | 整个 `pi` 进程在 policy-controlled 沙箱中 | 本地或远程托管沙箱                         | 需要 OpenShell 网关                                                        |

扩展在 `pi` 进程运行的位置运行。如果你使用 tool-routing 扩展运行主机 `pi`，其他自定义扩展工具仍会在主机上运行，除非它们也委托其操作。

## Gondolin

[Gondolin](https://github.com/earendil-works/gondolin) 是一个本地 Linux 微型虚拟机。
当你希望 `pi` 在主机上运行，但所有 built-in 工具都路由到虚拟机中时，请使用 [示例扩展](../examples/extensions/gondolin)。

设置：

```bash
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

从你想要挂载的项目运行：

```bash
cd /path/to/project
pi -e ~/.pi/agent/extensions/gondolin
```

该扩展将主机当前工作目录挂载到虚拟机中的 `/workspace`，并覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find` 和 `ls`。
用户 `!` 命令也会被路由到虚拟机中。
`/workspace` 下的文件更改会写回到主机。

要求：Node.js >= 23.6.0 以支持 `@earendil-works/gondolin`，另外 QEMU (需要通过你的包管理器安装)。

## 普通 Docker

当你想要最简单的本地容器边界时，在 Docker 中运行整个 `pi` 进程。

`Dockerfile.pi`：

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

构建并运行：

```bash
docker build -t pi-sandbox -f Dockerfile.pi .

docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

`-v "$PWD:/workspace"` 将你的当前目录挂载到容器中的 /workspace，这样 Docker 内 `/workspace` 中的读取和写入会直接影响你的主机文件，就像 Gondolin 示例中一样。

如果你想要 container-local 设置和会话，请为 `/root/.pi/agent` 使用命名卷。挂载你的主机 `~/.pi/agent` 会将主机认证和会话文件暴露给容器。

## OpenShell

当你想要一个具有文件系统、进程、网络、凭证和推理控制的 policy-controlled 沙箱时，请使用 [NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview)。
OpenShell 可以通过由 Docker、Podman 或虚拟机运行时支持的本地网关，或通过远程 Kubernetes 网关来运行沙箱。

每个沙箱都需要一个活跃的网关。
在创建沙箱之前，请注册并选择一个：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

在 OpenShell 沙箱内启动 `pi`：

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

在此模式下，整个 `pi` 进程在沙箱内运行。
内置工具、`!` 命令和扩展工具都在 OpenShell 边界内执行。

如果网关是远程的，项目文件不会从主机 bind-mounted，这意味着沙箱中的写入不会反映在你的机器上。
在沙箱内克隆仓库，或使用 OpenShell 文件传输命令：

```bash
openshell sandbox upload pi-sandbox ./repo /workspace
openshell sandbox download pi-sandbox /workspace/repo ./repo-out
```

OpenShell 提供商可以将原始模型 API 密钥保留在沙箱之外。
当配置了推理路由时，沙箱内的代码可以调用 `https://inference.local`，网关会在上游注入已配置的提供商凭证。
如果你希望模型流量使用此路由，请配置 Pi 使用相应的 OpenAI 兼容或 Anthropic 兼容端点。
