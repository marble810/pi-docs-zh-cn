# Pi

Pi 是一个可扩展的 AI 代理，可在你的终端中工作。给它一个目标和一个工作文件夹，它就能检查文件、运行命令、编辑内容，并完成 multi-step 任务。

将 Pi 用于软件开发、研究笔记、写作项目、数据文件或业余工作。你可以按原样使用 Pi，提示它适应你的工作流，或使用 SDK 构建由 Pi 驱动的其他应用程序。

## 开始使用 Pi｜ Start using Pi

初次使用 Pi？请按照 [Quickstart](quickstart.md) 安装 Pi、连接模型并完成你的第一个任务。

如果 Pi 已安装，请选择你想做的事情：

- [以交互方式使用 Pi](usage.md) 来添加文件、运行命令、指导正在进行的工作并导出结果。
- [选择模型](models.md)，或连接订阅、API 密钥、本地模型或兼容端点。
- [继续或分支会话](sessions.md)，以恢复工作或探索另一种方法而不丢失历史记录。
- [配置 Pi](configuration.md)，以设置你的偏好、工作文件夹、指令和可复用资源。
- [了解 Pi 的工作原理](how-pi-works.md)，包括工具、上下文、会话和代理循环。

## 自定义 Pi｜ Customize 

Pi 可以复用提示词、加载专用指令、添加可执行集成、更改其终端界面、连接模型服务，并将这些资源作为包分发。
使用 [快速入门自定义选择器](quickstart.md#choose-how-to-customize-pi) 来选择满足你需求的最小机制。

## 自动化或嵌入 Pi｜ Automate or embed 

- 使用 [打印模式](cli.md#invocation-and-output) 进行 one-off 和脚本化任务。
- 使用 [JSON 事件流模式](json.md) 来消费单次运行的结构化事件。
- 使用 [RPC 模式](rpc.md) 来控制单独的 Pi 进程。
- 使用 [TypeScript SDK](sdk.md) 在应用程序内运行 Pi。

## 查找参考和设置信息｜ Find reference and setup information

使用参考页面查阅 [CLI 选项](cli.md)、[设置](settings.md)、[模型提供商身份验证](providers.md)、[按键绑定](keybindings.md) 和 [环境变量](environment-variables.md)。

如需 platform-specific 帮助，请参阅 [终端设置](terminal-setup.md)、[Windows](windows.md)、[tmux](tmux.md)、[Android 上的 Termux](termux.md) 或 [容器化](containerization.md)。

## 安全地工作｜ Work safely

Pi 的工具和扩展以 Pi 进程的权限运行。项目信任控制 Pi 加载哪些项目资源，但它不会对工具调用进行沙箱隔离。在使用不受信任的文件、仓库、扩展或无人值守自动化之前，请查看 [安全](security.md)。
