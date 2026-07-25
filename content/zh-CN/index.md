# Pi 文档

Pi 是一个极简的终端编码运行框架。它设计为保持核心小巧，同时通过 TypeScript 扩展、技能、提示词模板、主题和 Pi 包进行扩展。

## 快速开始

使用 npm 安装 Pi：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 在安装时禁用依赖生命周期脚本。Pi 正常运行 npm installs. 不需要安装脚本。

在 Linux 或 macOS 上，你也可以使用安装程序：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

要卸载 pi 本身，请使用 npm for curl and npm installs：

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

对于 pnpm、Yarn 或 Bun 安装，请使用相应的全局删除命令：`pnpm remove -g @earendil-works/pi-coding-agent`、`yarn global remove @earendil-works/pi-coding-agent` 或 `bun uninstall -g @earendil-works/pi-coding-agent`。

然后在项目目录中运行它：

```bash
pi
```

对于订阅制模型提供商，使用 `/login` 进行身份验证，或在启动 pi 前设置 API 密钥，例如 `ANTHROPIC_API_KEY`。

完整的 first-run 流程，请参见 [快速开始](quickstart.md)。

## 从这里开始

- [快速开始](quickstart.md)——安装、身份验证并运行第一个会话。
- [使用 Pi](usage.md)——交互模式、斜杠命令、上下文文件和 CLI 参考。
- [模型提供商](providers.md)——订阅制以及 API 密钥方式设置 built-in 提供商。
- [llama.cpp](llama-cpp.md)——使用 `/llama` 运行本地路由并管理模型。
- [安全](security.md)——项目信任、沙箱边界和漏洞报告。
- [容器化](containerization.md)——使用 Gondolin、Docker 或 OpenShell 对 pi 进行沙箱化。
- [设置｜ Settings](settings.md) - 全局和项目配置。
- [快捷键｜ Keybindings](keybindings.md) - 默认快捷键和自定义快捷键。
- [会话｜ Sessions](sessions.md) - 会话管理、分支和树导航。
- [上下文压缩｜上下文压缩](compaction.md) - 上下文压缩和分支摘要。

## 自定义｜ Customization

- [扩展｜ Extensions](extensions.md) - TypeScript 模块，用于工具、命令、事件和自定义 UI。
- [技能｜ Skills](skills.md) - 代理 技能，用于可复用的 on-demand 能力。
- [提示词模板｜ Prompt templates](prompt-templates.md) - 可从斜杠命令展开的可复用提示词。
- [主题｜ Themes](themes.md) - built-in 和自定义终端主题。
- [Pi packages](packages.md) - 打包和共享扩展、技能、提示词和主题。
- [自定义模型｜ Custom models](models.md) - 为受支持的模型提供商 API 添加模型条目。
- [自定义提供商｜ Custom providers](custom-provider.md) - 实现自定义 API 和 OAuth 流程。

## 编程使用｜ Programmatic usage

- [SDK](sdk.md) - 将 pi 嵌入 Node.js 应用程序。
- [RPC mode](rpc.md) - 通过标准输入/输出集成 JSONL。
- [JSON event stream mode](json.md) - 带有结构化事件的打印模式。
- [TUI components](tui.md) - 为扩展构建自定义终端 UI。

## 参考｜ Reference

- [环境变量｜ Environment variables](environment-variables.md) - 可供 bash 工具使用的 Pi 进程配置和会话元数据。
- [会话格式｜会话 format](session-format.md) - JSONL 会话文件格式、条目类型和 SessionManager API。

## 平台设置｜ Platform setup

- [Windows](windows.md)
- [Android 上的 Termux](termux.md)
- [tmux](tmux.md)
- [终端设置](terminal-setup.md)
- [Shell 别名](shell-aliases.md)

## 开发｜ Development

- [开发](development.md) - 本地设置、项目结构和调试。
