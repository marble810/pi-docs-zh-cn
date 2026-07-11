#

1. run the whole `pi` process inside an isolated environment, or
2. run `pi` on the host and route tool execution into an isolated environment.

##

|                                                      |     |                                                                          |     |
| ---------------------------------------------------- | --- | ------------------------------------------------------------------------ | --- |
| Gondolin-in tools and `!` commands                   |     | See [`examples/extensions/gondolin/`](../examples/extensions/gondolin/). |
| 普通 Docker` process in a local container            |     |                                                                          |
| OpenShell`pi` process in a policy-controlled sandbox |     | 需要一个 OpenShell 网关                                                  |

Extensions run wherever the `pi` process runs. If you run host `pi` with a tool-routing extension, other custom extension tools still run on the host unless they also delegate their operations.

## Gondolin

[Gondolin](https://github.com/earendil-works/gondolin) is a local Linux micro-VM.
Use the [example extension](../examples/extensions/gondolin) when you want `pi` on the host but all built-in tools routed into the VM.

设置：

```bash
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

从你想要挂载的项目中运行：

```bash
cd /path/to/project
pi -e ~/.pi/agent/extensions/gondolin
```

The extension mounts the host cwd at `/workspace` in the VM and overrides `read`, `write`, `edit`, `bash`, `grep`, `find`, and `ls`.
User `!` commands are routed into the VM, as well.
File changes under `/workspace` write through to the host.

Requirements: Node.js >= 23.6.0 for `@earendil-works/gondolin`, plus QEMU (requires installation through your package manager).

## Plain Docker

Run the whole `pi` process in Docker when you want the simplest local container boundary.

`Dockerfile.pi`:

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

The `-v "$PWD:/workspace"` mounts your current directory into the container at /workspace such that reads and writes in `/workspace` inside Docker directly affect your host files, like in the Gondolin example.

Use a named volume for `/root/.pi/agent` if you want container-local settings and sessions. Mounting your host `~/.pi/agent` exposes host auth and session files to the container.

## OpenShell

Use [NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview) when you want a policy-controlled sandbox with filesystem, process, network, credential, and inference controls.
OpenShell can run sandboxes through a local gateway backed by Docker, Podman, or a VM runtime, or through a remote Kubernetes gateway.

每个沙箱都需要一个活跃的网关。
在创建沙箱之前，请注册并选择一个：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

Launch `pi` inside an OpenShell sandbox:

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

In this pattern, the whole `pi` process runs inside the sandbox.
Built-in tools, `!` commands, and extension tools execute inside the OpenShell boundary.

如果网关是远程的，项目文件不会从主机绑定挂载，这意味着沙箱中的写入不会反映在你的机器上。
在沙箱内克隆仓库或使用 OpenShell 文件传输命令：

```bash
openshell sandbox upload pi-sandbox ./repo /workspace
openshell sandbox download pi-sandbox /workspace/repo ./repo-out
```

OpenShell providers can keep raw model API keys outside the sandbox.
When inference routing is configured, code inside the sandbox can call `https://inference.local`, and the gateway injects the configured provider credentials upstream.
Configure Pi to use the corresponding OpenAI-compatible or Anthropic-compatible endpoint if you want model traffic to use this route.
