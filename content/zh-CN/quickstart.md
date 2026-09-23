# 快速开始｜ Quickstart

Pi 在你的终端中运行，并处理你机器上的文件。要使用它，你需要通过受支持的模型提供商访问某个模型。这可以是订阅、API 密钥或本地模型。

如需原生 Windows 安装方式，请阅读 [Windows 安装](windows.md)。如需 Android ，请阅读 [Termux 安装](termux.md)。

## 1. 安装 Pi

在 macOS 或 Linux 上，你可以使用安装程序：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

或者，从 npm 安装 Pi。这需要 Node.js 22.19 或更高版本：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Pi 在正常的 npm installation. 中不需要依赖生命周期脚本

验证安装：

```bash
pi --version
```

## 2. 启动 Pi

切换到你想让 Pi 处理的文件夹，然后启动它：

```bash
cd /path/to/folder
pi
```

工作文件夹有助于 Pi 发现相关文件、指令和配置。Pi 也使用它来对已保存的会话进行分组。

<p align="center"><img src="images/interactive-mode.png" alt="Pi running in a terminal with a conversation, input editor, and status footer" width="750"></p>

界面会显示你的对话、用于输入提示词和命令的编辑器，以及包含当前文件夹、模型和会话状态的页脚。请参阅 [在终端中使用 Pi](usage.md)，了解如何添加文件、运行命令、指导正在进行的工作以及管理结果。

## 3. 选择模型

**模型**会生成 Pi 的响应。**模型提供商**是 Pi 用来访问该模型的服务或账户。

在 Pi 中，运行：

```text
/login
```

选择一个模型提供商，然后按照提示使用订阅或存储 API 密钥。如果你之后想选择其他可用模型，请运行 `/model`。

请参阅 [选择模型和模型提供商](models.md)，了解受支持的模型提供商、environment-variable 身份验证、本地模型和自定义端点。

## 4. 给 Pi 一个任务

Pi 会显示它执行的每次文件读取、搜索、命令和编辑。它不会在每次工具调用前都询问。

输入一个与你工作相匹配的任务，例如：

```text
Summarize @meeting-notes.md and save the action items to action-items.md.
```

```text
Explain how this repository is structured and how to run its checks.
```

```text
Compare @previous.csv with @current.csv and summarize the important changes.
```

在编辑器中输入 `@` 来搜索文件，而无需输入完整路径。当 Pi 完成后，检查其响应以及任何已更改的文件。对于重要工作，请使用版本控制或备份。对于不受信任或无人值守的工作，请使用容器或其他沙箱。参见 [Security](security.md)。

## 稍后继续

Pi 会自动保存会话。退出 Pi，然后使用以下命令恢复同一工作文件夹的最近会话：

```bash
pi --continue
```

使用 `/resume` 选择另一个已保存的会话。有关会话命名、分支、上下文压缩、导出和共享，请参见 [Continue or branch a 会话](sessions.md)。

## 后续步骤

- [以交互方式使用 Pi](usage.md) 来了解输入、命令、快捷键和排队消息。
- [添加指令](configuration.md#context-files)，让 Pi 在某个文件夹中工作时始终遵循这些指令。
- [选择模型和模型提供商](models.md)。

### 选择如何自定义 Pi

从满足你需求的最弱机制开始：

| 需求 | 从以下开始 |
|---|---|
| 为 Pi 提供某个文件夹的持久指令 | [`AGENTS.md`](configuration.md#context-files) |
| 从 `/` 菜单中复用提示词 | [提示词模板](prompt-templates.md) |
| 添加 task-specific 指令和支持文件 | [技能](skills.md) |
| 添加可执行工具、命令或事件处理器 | [扩展](extensions.md) |
| 构建自定义终端组件 | [终端 UI](tui.md) |
| 连接不受支持的模型服务 | [自定义模型提供商](custom-provider.md) |
| 安装或分发多个资源 | [Pi 包](packages.md) |

## 卸载 Pi

如果你使用 npm 安装了 Pi，请运行：

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

如果你使用了安装程序，请再次运行它并选择 **Uninstall Pi**：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

这两种方法都不会从 `~/.pi/agent/` 中移除配置、凭据、会话或已安装的 Pi 包。
