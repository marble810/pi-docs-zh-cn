# Pi 文档

Pi 是一个极简的终端编程代理运行框架。其设计理念是保持核心小巧，同时通过 TypeScript 扩展、技能、提示词模板、主题和 pi 包进行扩展。

## 快速入门

使用 npm 安装 Pi：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 会在安装期间禁用依赖项的生命周期脚本。Pi 在正常 npm installs. 时不需要安装脚本。

在 Linux 或 macOS 上，你也可以使用安装程序：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

要卸载 pi 本身，请使用 npm for curl and npm installs：

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

对于 pnpm、Yarn 或 Bun 安装，请使用对应的全局删除命令：`pnpm remove -g @earendil-works/pi-coding-agent`、`yarn global remove @earendil-works/pi-coding-agent` 或 `bun uninstall -g @earendil-works/pi-coding-agent`。

然后在项目目录中运行它：

```bash
pi
```

对于订阅制模型提供商，请使用 `/login` 进行身份验证；或者在启动 pi 之前设置一个 API 密钥，例如 `ANTHROPIC_API_KEY`。

有关完整的 first-run 流程，请参阅 [Quickstart](quickstart.md)。

## 从这里开始

- [Quickstart](quickstart.md) - 安装、身份验证并运行第一个会话。
- [使用Pi](usage.md) - 交互模式、斜杠命令、上下文文件以及CLI参考。
- [模型提供商](providers.md) - built-in提供商的订阅和API密钥设置。
- [安全](security.md) - 项目信任、沙箱边界和漏洞报告。
- [容器化](containerization.md) - 使用 Gondolin、Docker 或OpenShell进行沙箱化 pi。
- [设置](settings.md) - 全局和项目设置。
- [按键绑定](keybindings.md) - 默认快捷键和自定义按键绑定。
- [会话](sessions.md) - 会话管理、分支和树导航。
- [上下文压缩](compaction.md) - 上下文压缩和分支摘要。

## 自定义

- [扩展](extensions.md) - 用于工具、命令、事件和自定义 UI 的TypeScript模块。
- [技能](skills.md) - 用于可复用on-demand能力的代理技能。
- [提示词模板](prompt-templates.md) - 从斜杠命令展开的可复用提示词。
- [主题](themes.md) - built-in和自定义终端主题。
- [Pi包](packages.md) - 打包和共享扩展、技能、提示词和主题。
- [自定义模型](models.md) - 为支持的提供商 API 添加模型条目。
- [自定义提供商](custom-provider.md) - 实现自定义 API 和 OAuth 流程。

## 编程式使用

- [SDK](sdk.md) - 在Node.js应用中嵌入 pi。
- [RPC模式](rpc.md) - 通过 stdin/stdout JSONL进行集成。
- [JSON事件流模式](json.md) - 带有结构化事件的打印模式。
- [TUI组件](tui.md) - 为扩展构建自定义终端 UI。

## 参考

- [会话格式](session-format.md) - JSONL会话文件格式、条目类型以及SessionManager API。

## 平台设置

- [Windows](windows.md)
- [Android 上的 Termux](termux.md)
- [tmux](tmux.md)
- [终端设置](terminal-setup.md)
- [Shell 别名](shell-aliases.md)

## 开发

- [开发](development.md) - 本地设置、项目结构和调试。
