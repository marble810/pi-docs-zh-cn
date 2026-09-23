# 在终端中使用 Pi

在您想要工作的文件夹中运行 `pi`。Pi 使用该文件夹来发现文件、指令和配置，并对已保存的会话进行分组。如果您尚未安装 Pi 或尚未选择模型，请遵循 [Quickstart](quickstart.md)。

Pi 可能会在加载项目资源之前询问您是否信任该工作文件夹。请参阅 [Project trust](security.md#understand-project-trust)。

<p align="center"><img src="images/interactive-mode.png" alt="Pi interactive mode showing a conversation, editor, and status information" width="750"></p>

记录显示了您的提示词、Pi 的响应、工具调用、结果和错误。您在编辑器中编写提示词和命令。页脚显示当前文件夹、会话、模型、上下文使用情况以及累计用量和成本。

## 输入提示词｜ Enter a prompt

输入请求并按 `Enter` 发送。使用 `Shift+Enter` 添加一行，或按 `Ctrl+G` 在您配置的外部编辑器中处理更长的提示词。

要包含文件或图像：

- 输入 `@` 以搜索文件并将其添加到您的提示词中。
- 按 `Tab` 补全路径。
- 粘贴图像或将其拖入兼容的终端。

## 跟进 Pi 的工作｜ Follow Pi's work

Pi 在工作时显示每个工具调用和结果。按 `Ctrl+O` 展开或折叠工具输出。按 `Ctrl+T` 显示或隐藏思考块。

启动标头列出了 Pi 加载的指令和资源。编辑器边框指示当前思考级别。页脚会随着模型使用上下文和报告用量而更新。

Pi 不会在每次工具调用前询问。请审查命令和已更改的文件，并对不受信任或无人值守的工作使用沙箱。请参阅 [Security](security.md)。

## 改变方向｜ Change direction

您可以在 Pi 工作时发送更多输入：

| 你想要做什么 | 操作 |
|---|---|
| 调整当前任务 | 输入一条消息并按 `Enter` |
| 在当前任务之后添加工作 | 输入一条消息并按 `Alt+Enter` |
| 将排队的消息返回到编辑器 | 按 `Alt+Up` |
| 停止当前任务 | 按 `Escape` |

使用 `Enter` 发送的消息会等待当前响应及其工具调用完成，然后引导下一次响应。使用 `Alt+Enter` 发送的 follow-up 会等待 Pi 完成当前任务。中止会将排队的消息返回到编辑器。

Windows 终端 保留了一些 Alt 快捷键。有关 Windows 的替代方案，请参阅 [终端 Setup](terminal-setup.md)。

## 更改模型或设置

输入 `/` 以搜索可用命令。你最常使用的命令是：

- `/model` 选择一个模型。按 `Ctrl+L` 打开相同的选择器。
- `/thinking` 选择当前模型使用多少推理。按 `Shift+Tab` 循环切换支持的级别。
- `/login` 和 `/logout` 管理模型提供商访问。
- `/settings` 更改常用首选项。

提示词模板、技能和扩展可以向同一菜单添加更多命令。请参阅 [Choose a Model](models.md)、[配置](configuration.md)，或完整的 [Slash Commands reference](slash-commands.md)。

## 继续或重新开始

除非禁用会话持久化，否则 Pi 会自动保存会话。

- `/new` 启动一个新会话。
- `/resume` 打开另一个已保存的会话。
- `/name` 为当前会话提供一个可识别的名称。
- `/session` 显示其文件、ID、消息数量、token 用量和成本。

当你想探索另一种方法而不丢失现有工作时，使用 `/tree`、`/fork` 或 `/clone`。使用 `/compact` 减少发送给模型的对话历史。有关这些工作流，请参阅 [Sessions and Context](sessions.md)。

离开 Pi 后，从同一文件夹运行 `pi --continue` 以恢复其最近的会话。

## 运行终端命令｜ Run a 终端 command

在命令前加上 `!` 来运行它，并将其输出包含在对话中：

```text
!git status
```

当你想运行命令而不将其输出发送给模型时，使用 `!!`。

## 复制、导出或分享结果｜ Copy, export, or share results

按 `Ctrl+X` 或运行 `/copy` 来复制最后一条助手回复。使用 `/export` 将会话保存为 HTML 或 JSONL。

使用 `/share` 上传会话并获取查看器链接。通过 Radius 身份验证，该产物对你的 Radius 组织可见。否则，Pi 会通过 GitHub CLI 创建一个私有的 GitHub gist。请先检查会话，因为它可能包含对话期间暴露的提示词、工具输出、文件内容和凭据。

## 调整终端｜ Adjust the 终端

常规模式使用终端的正常回滚缓冲区。全屏模式保持编辑器和状态区域固定，同时记录在终端窗口内滚动。通过 `/settings` 或 `--tui-mode` 选择模式。

终端对鼠标输入、键盘快捷键和内联图像的支持各不相同。有关 platform-specific 配置，请参阅 [终端 Setup](terminal-setup.md)；有关所有可配置的快捷键，请参阅 [Keybindings](keybindings.md)。运行 `/hotkeys` 以检查当前会话中处于活动状态的快捷键。

## 收集诊断信息｜ Collect diagnostic information

在对终端渲染或对话状态进行故障排除时，运行 `/debug`。Pi 会将渲染的终端行和当前会话消息写入你的 [代理 directory](configuration.md#agent-directory) 中的 `pi-debug.log`。

在分享此文件之前请先检查它。它可能包含提示词、模型响应、工具输出、文件内容和终端数据。
