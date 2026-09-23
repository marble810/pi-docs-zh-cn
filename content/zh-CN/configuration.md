# 配置｜配置

Pi 支持 user-level 和项目配置。用户级配置位于代理目录中，该目录默认为 `~/.pi/agent`。项目配置位于工作目录下的 `.pi` 中，并在授予 [项目信任](security.md#understand-project-trust) 后加载。唯一的例外是 `sessionDir`，Pi 会在解析信任之前读取它，以便定位会话。

在交互模式下，使用 `/settings` 更改常用偏好设置。对于其他选项，请让 Pi 更新配置，或直接编辑相关文件。在手动更改设置、键位绑定、指令或资源后，运行 `/reload`。

## 代理目录｜代理 directory

代理目录如下方 `<agent-dir>` 所示。可通过 `PI_CODING_AGENT_DIR` 环境变量或 SDK 的 [`agentDir`](sdk.md) 选项设置其位置。

| 路径｜ Path | 职责｜ Responsibility |
|---|---|
| `<agent-dir>/settings.json` | 用户级 [设置](settings.md)，包括偏好设置、默认值、资源路径和 Pi 包声明。 |
| `<agent-dir>/keybindings.json` | 自定义终端 UI 和应用程序 [键位绑定](keybindings.md)。 |
| `<agent-dir>/models.json` | [兼容端点、模型和模型覆盖](models.md#configure-a-compatible-endpoint)。 |
| `<agent-dir>/auth.json` | 保存的 API 密钥和 OAuth 凭据。 |
| `<agent-dir>/AGENTS.override.md`、`AGENTS.md`、`AGENTS.MD`、`CLAUDE.md` 或 `CLAUDE.MD` | 应用于各工作目录的用户指令。 |
| `<agent-dir>/SYSTEM.md` | 替换 Pi 的默认系统提示词。 |
| `<agent-dir>/APPEND_SYSTEM.md` | 向 Pi 的系统提示词添加指令。 |
| `<agent-dir>/extensions/` | 用户 [扩展](extensions.md)。 |
| `<agent-dir>/skills/` | 用户 [skills](skills.md) 及支持文件。 |
| `<agent-dir>/prompts/` | 用户 [prompt templates](prompt-templates.md) 作为斜杠命令公开。 |
| `<agent-dir>/themes/` | 用户 [theme](themes.md) 文件。 |

## 项目 `.pi` 目录

| 路径 | 职责 |
|---|---|
| `.pi/settings.json` | 项目级 [settings](settings.md)、资源路径和 Pi 包声明。 |
| `.pi/SYSTEM.md` | 替换项目的系统提示词。 |
| `.pi/APPEND_SYSTEM.md` | 将 project-specific 指令添加到系统提示词。 |
| `.pi/extensions/` | 项目扩展。 |
| `.pi/skills/` | 项目技能及支持文件。 |
| `.pi/prompts/` | 作为斜杠命令公开的项目提示词模板。 |
| `.pi/themes/` | 项目主题文件。 |

对于 `SYSTEM.md` 和 `APPEND_SYSTEM.md`，受信任的项目文件优先于对应的 agent-directory 文件。同名文件不会合并。

## 上下文文件｜ Context files

上下文文件与项目 `.pi` 配置相互独立。Pi 从代理目录、工作目录及其父目录加载它们。只要 Pi 在其目录或该目录下的任意位置运行，上下文文件就会生效。

`AGENTS.override.md` 仅在同一目录中替换 `AGENTS.md` 或 `CLAUDE.md`。它不会抑制来自代理目录或其他目录的上下文文件。

上下文文件的发现不需要项目信任。
