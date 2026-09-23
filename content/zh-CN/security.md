# 安全运行 Pi

将 model-generated 命令和代码视为不可信。Pi 可以以启动它的账户的权限读取、更改和执行文件，并且它不会在每次工具调用前请求批准。扩展、包安装器、语言服务器和其他子进程会以相同的权限运行，除非 operating-system 或虚拟化边界对其加以限制。

文件、注释、指令、命令输出和模型响应都可能通过提示词注入操纵模型。项目信任控制启动时加载哪些项目资源，但并不会使这些内容或由此产生的操作变得安全。

安全性来自限制 Pi 在生成的操作错误或具有恶意时可以访问和影响的文件、凭据、进程和网络服务。查看转录、使用项目信任以及审查更改并不会形成安全边界。

## 选择如何运行 Pi｜ Choose how to run Pi

运行 Pi 的不同方式会对生成的命令可以访问的内容施加不同的限制：

| Pi 如何运行 | 哪些内容仍受保护 |
|---|---|
| 直接运行，使用其 operating-system 用户的权限 | 该用户无法访问的任何内容。专用用户账户可以缩小这些权限，但 Pi 仍与其他用户共享操作系统和网络。 |
| 完全在容器、虚拟机或沙箱内运行 | 你未向该环境暴露的主机文件和进程。如果你在其中提供凭据和网络服务，它们仍可被访问。这通常是实际中最强的选项。 |
| 在隔离环境之外运行，仅其 built-in 工具在隔离环境内运行 | 主机资源受到保护，免受通过这些工具执行的操作影响。Pi 本身和其他扩展仍在边界之外，因此这是一种范围更窄的隔离形式。 |

工作文件夹控制资源发现以及工具的默认位置，但它不会阻止命令访问 Pi 进程可用的其他路径。

无论你选择哪种选项，都只提供任务所需的文件和服务。尽可能将凭据保留在环境之外，或使用范围狭窄的 short-lived 凭据。当命令不需要网络访问时，限制网络访问。

有关设置说明以及每种隔离方法的限制，请参阅 [在隔离环境中运行 Pi](containerization.md)。

<a id="project-trust"></a>

## 了解项目信任｜ Understand project trust

项目信任控制 Pi 是否加载工作文件夹提供的大部分设置和资源。它可防止文件夹在你批准之前静默加载可执行扩展。

项目信任并非完整的启动边界。Pi 在选择或创建会话时、解析项目信任之前，会读取项目 `sessionDir` 设置。拒绝信任会阻止其余项目设置和受保护资源加载，但无法撤销最初的 session-directory 查找。

项目信任不会限制工具调用可以访问或影响的内容。Pi 启动后，已启用的工具仍使用 Pi 进程的 operating-system 权限。文件夹中的指令和其他内容也可能影响模型。

### 受项目信任保护的资源｜ Resources protected by project trust

当 Pi 从当前工作目录发现以下任一资源时，需要做出 project-trust 决策：

- `.pi/settings.json`
- `.pi/extensions`、`.pi/skills`、`.pi/prompts` 或 `.pi/themes`
- `.pi/SYSTEM.md` 或 `.pi/APPEND_SYSTEM.md`
- 当前目录或祖先目录中的项目 `.agents/skills`

裸 `.pi` 目录不需要项目信任。

授予项目信任允许 Pi 加载：

- 项目设置
- `.pi` 下的扩展、技能、提示词模板、主题和 system-prompt 文件
- 通过项目设置配置的缺失包
- project-local 和 project-package 扩展

拒绝项目信任会跳过这些受保护的资源，但上文描述的初始 `sessionDir` 查找除外。

诸如 `AGENTS.override.md`、`AGENTS.md` 和 `CLAUDE.md` 之类的上下文文件会无视项目信任而加载，除非你禁用上下文加载。即使你拒绝项目信任，也要将文件夹中的指令视为不受信任的输入。

### Pi 如何选择信任决策

command-line `--approve` 或 `--no-approve` 覆盖会首先生效。当存在受保护的资源且没有 command-line 覆盖时：

1. 用户级和 command-line 扩展可以处理 `project_trust` 事件。第一个返回 yes 或 no 的扩展拥有该决策。
2. 如果没有扩展做出决策，Pi 会查找当前目录或其某个父目录的已保存决策。最接近的决策生效。
3. 如果没有适用的已保存决策，Pi 会遵循全局 `defaultProjectTrust` 设置，其默认值为 `"ask"`。

已保存的决策使用规范目录路径，并位于：

```text
~/.pi/agent/trust.json
```

使用 `/trust` 为未来的 Pi 进程保存决策。

### 无交互提示时的项目信任

打印、JSON 和 RPC 模式无法显示 built-in 信任提示。如果没有适用的 command-line 覆盖、扩展或已保存决策：

- `defaultProjectTrust: "always"` 会加载受保护的项目资源。
- `defaultProjectTrust: "ask"` 或 `"never"` 会跳过它们。

当自动化运行需要明确的 one-time 决策时，使用 `--approve` 或 `--no-approve`。

## 减少影响并改善恢复

这些做法不能替代隔离，但它们可以减少暴露或使恢复更容易：

- 仅授予 Pi 访问任务所需的文件和服务。
- 在进行重大更改之前，使用快照、备份或版本控制。
- 在加载扩展和包之前先审查它们。扩展会在 Pi 进程内执行。
- 优先使用范围狭窄的 short-lived 凭据。
- 在将结果应用到另一个系统之前，请先审查差异和生成的输出。
- 在导出或共享会话之前，请先审查会话内容。它们可能包含提示词、工具参数、命令输出、文件内容以及对话过程中暴露的凭据。

## 报告安全问题｜ Report a security issue

请遵循仓库的 [Security Policy](https://github.com/earendil-works/pi/blob/main/SECURITY.md)。不要为 security-sensitive 报告创建公开 issue。

预期的 local-agent 行为、来自不受信任内容的提示词注入、缺少 built-in 沙箱，以及来自 user-installed 扩展或技能的行为，通常不在安全边界之内，除非该报告能够证明存在 privilege-boundary 绕过，或访问了本地用户原本并不拥有的资源。
