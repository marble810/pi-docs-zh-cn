# 安全｜ Security

Pi 是一个本地编程代理。它使用启动它的用户账户的权限运行，并将该用户可写的文件视为位于同一本地信任边界内。

## 项目信任｜ Project Trust

项目信任控制 pi 是否加载 project-local 设置、资源、包和扩展。它不是沙箱，也不会限制您在目录中开始工作后模型可以要求工具执行的操作。

当 Pi 从当前工作目录中发现以下任何内容时，它会认为项目具有需要信任的资源：

- `.pi/settings.json`
- `.pi/extensions`、`.pi/skills`、`.pi/prompts` 或 `.pi/themes`
- `.pi/SYSTEM.md` 或 `.pi/APPEND_SYSTEM.md`
- 当前目录或祖先目录中的项目 `.agents/skills`

裸 `.pi` 目录不算作需要信任的项目资源。

当交互式会话在具有需要信任的资源且当前目录或父目录没有已保存决策的项目中启动时， pi 遵循全局设置中的 `defaultProjectTrust`。默认值为 `"ask"`，当 UI 可用时会询问是否信任该项目。已保存的决策按规范目录存储在 `~/.pi/agent/trust.json` 中，当前或父路径上最近的已保存决策优先于全局默认值。

信任项目允许 pi 加载需要信任的项目资源，包括：

- `.pi/settings.json`
- `.pi` 资源，如扩展、技能、提示词模板、主题和系统提示词文件
- 通过项目设置配置的缺失项目包
- project-local 扩展和项目 package-managed 扩展

拒绝信任会跳过受保护资源。除非上下文加载被禁用，否则上下文文件（如 `AGENTS.override.md`、`AGENTS.md` 和 `CLAUDE.md`）无论项目信任状态如何都会被加载。在信任解决之前， pi 仅加载上下文文件、用户/全局扩展和 CLI `-e` 扩展。用户/全局和 CLI 扩展可以处理 `project_trust` 事件；第一个返回是/否决定的扩展拥有该决定权。

非交互模式 (`-p`、`--mode json` 和 `--mode rpc`) 不显示信任提示。在没有适用的已保存信任决定的情况下，`defaultProjectTrust: "ask"` 和 `"never"` 会忽略此类资源，而 `"always"` 会信任它们。使用 `--approve`/`-a` 或 `--no-approve`/`-na` 可覆盖单次运行的项目信任。

## 无内置沙箱｜ No Built-in Sandbox

Pi 不包含 built-in 沙箱。内置工具可以读取文件、写入文件、编辑文件，并以 pi 进程的权限运行 shell 命令。扩展是 TypeScript 模块，以相同权限运行。包安装、shell 命令、语言服务器、测试命令和其他开发工具的行为与普通本地进程相同。

这是有意为之。Pi 设计用于操作本地 source trees、调用项目工具链，并与用户现有的开发环境集成。部分 in-process 沙箱容易被误解为安全边界，同时仍依赖宿主 shell、文件系统、包管理器、凭据和扩展代码。真正的隔离需要来自操作系统或虚拟化/容器边界。

项目信任只是一个 input-loading 防护。它防止仓库在你批准之前静默更改 pi 的设置或扩展。它不会使不受信任的代码、不受信任的提示或不受信任的模型输出变得安全。来自仓库文件、注释、文档、上下文文件或构建输出的提示注入是预期的 local-agent 风险，无法由 pi 可靠地阻止。

## 运行不受信任或未监控的工作｜ Running Untrusted or Unmonitored Work

对于不受信任的仓库、你不打算密切监控的生成代码或无人值守的自动化，请在受控环境中运行 pi。使用容器、虚拟机、微型虚拟机、远程沙箱或 policy-controlled 沙箱，仅包含任务所需的文件和凭据。

常见模式记录在 [容器化](containerization.md) 中：

- 在容器/沙箱内运行整个 `pi` 进程
- 运行宿主 pi ，同时将 built-in 工具执行路由到 Gondolin 微型虚拟机中
- 仅挂载代理应访问的工作区路径
- 除非容器应访问宿主会话、设置和凭据，否则避免挂载宿主 `~/.pi/agent`
- 传递所需的最少 API 密钥或使用 short-lived 凭据
- 当任务不需要网络访问时，限制网络访问
- 在将结果复制回受信任系统之前，审查差异和输出

如果你 bind-mount 宿主工作区读写，容器或虚拟机内部的写入仍可能修改宿主文件。当你需要更强地防止意外写入时，请使用 read-only 挂载或将文件复制进出沙箱。

## 报告安全问题｜ Reporting Security Issues

要报告安全问题，请遵循仓库的 [安全政策](https://github.com/earendil-works/pi-mono/blob/main/SECURITY.md)。不要为 security-sensitive 报告公开问题。

预期的 local-agent 行为、缺少 built-in 沙箱、来自不受信任内容的提示注入以及 user-installed 扩展或技能的行为通常不在安全边界内，除非报告演示了真正的 privilege-boundary 绕过或展示了 pi 如何授予本地用户原本没有的访问权限。
