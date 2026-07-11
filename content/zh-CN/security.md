#

##

- `.pi/settings.json`
- `.pi/extensions`, `.pi/skills`, `.pi/prompts`, or `.pi/themes`
- `.pi/SYSTEM.md` or `.pi/APPEND_SYSTEM.md`
- project `.agents/skills` in the current directory or an ancestor directory

A bare `.pi` directory does not count as a project resource that requires trust.

When an interactive session starts in a project with resources that require trust and no saved decision for the current directory or a parent directory, pi follows `defaultProjectTrust` from global settings. The default value is `"ask"`, which asks whether to trust the project when UI is available. Saved decisions are stored by canonical directory in `~/.pi/agent/trust.json`, and the closest saved decision on the current or parent path applies before the global default.

- `.pi/settings.json`
- `.pi` resources such as extensions, skills, prompt templates, themes, and system prompt files
- 通过项目设置配置的缺失项目包
- 项目本地扩展和项目包管理的扩展

Declining trust skips protected resources. `AGENTS.md` and `CLAUDE.md` context files are loaded regardless of project trust unless context loading is disabled. Before trust is resolved, pi only loads context files, user/global extensions, and CLI `-e` extensions. User/global and CLI extensions can handle the `project_trust` event; the first extension that returns a yes/no decision owns the decision.

Non-interactive modes (`-p`, `--mode json`, and `--mode rpc`) do not show a trust prompt. Without an applicable saved trust decision, `defaultProjectTrust: "ask"` and `"never"` ignore such resources, while `"always"` trusts them. Use `--approve`/`-a` or `--no-approve`/`-na` to override project trust for one run.

## 无内置沙箱

Pi 不包含内置沙箱。内置工具可以读取文件、写入文件、编辑文件，并以 pi 进程的权限运行 shell 命令。扩展是以相同权限运行的 TypeScript 模块。包安装、shell 命令、语言服务器、测试命令和其他开发者工具的行为与普通本地进程相同。

这是有意为之。Pi 旨在操作本地源代码树、调用项目工具链，并与用户现有的开发环境集成。部分进程内沙箱很容易被误解为安全边界，同时仍然依赖于主机 shell、文件系统、包管理器、凭证和扩展代码。真正的隔离需要来自操作系统或虚拟化/容器边界。

项目信任仅是一个输入加载防护。它防止仓库在你批准之前静默更改 pi 的设置或扩展。它不会使不受信任的代码、不受信任的提示词或不受信任的模型输出变得安全。来自仓库文件、注释、文档、上下文文件或构建输出的提示词注入是预期的本地代理风险， pi 无法可靠地防止。

## 运行不受信任或不受监控的工作

对于不受信任的仓库、你不打算密切监控的生成代码或无人值守的自动化，请在受控环境中运行 pi。使用容器、虚拟机、微型虚拟机、远程沙箱或策略控制的沙箱，仅提供任务所需的文件和凭证。

Common patterns are documented in [Containerization](containerization.md):

- run the whole `pi` process inside a container/sandbox
- 运行主机 pi ，同时将内置工具执行路由到 Gondolin 微型虚拟机中
- 仅挂载代理应访问的工作目录路径
- avoid mounting host `~/.pi/agent` unless the container should access host sessions, settings, and credentials
- 传递所需的最少 API 密钥或使用短期凭证
- 当任务不需要时限制网络访问
- 在将结果复制回受信任系统之前审查差异和输出

如果你以读写方式绑定挂载主机工作目录，容器或虚拟机内部的写入操作仍可能修改主机文件。当你需要更强的保护以防止意外写入时，请使用只读挂载或将文件复制进出沙箱。

## 报告安全问题

To report a security issue, follow the repository [Security Policy](https://github.com/earendil-works/pi-mono/blob/main/SECURITY.md). Do not open a public issue for security-sensitive reports.

预期的本地代理行为、缺乏内置沙箱、来自不受信任内容的提示词注入以及用户安装的扩展或技能的行为通常不在安全边界之内，除非报告证明了真正的权限边界绕过，或展示了 pi 如何授予本地用户原本没有的访问权限。
