# 斜杠命令｜ Slash commands

在 Pi 的终端编辑器中输入 `/` 以搜索当前会话中可用的命令。本页列出了当前 Pi 版本中的 built-in 命令。

扩展、提示词模板和技能可以添加命令。因此，Pi 中的命令菜单是会话中所加载资源的准确参考。

## 模型与设置｜ Models and settings

| 命令 | 描述 |
|---|---|
| `/settings` | 打开设置 |
| `/model [provider/model]` | 选择模型 |
| `/thinking [level]` | 设置思考级别 |
| `/scoped-models` | 配置交互式循环所使用的模型 |
| `/login [provider]` | 添加模型提供商身份验证 |
| `/logout` | 移除模型提供商身份验证 |
| `/llama` | 在已配置的 llama.cpp 路由器上管理模型 |

## 会话与上下文｜ Sessions and context

| 命令 | 描述 |
|---|---|
| `/new` | 启动新会话 |
| `/resume` | 切换到另一个已保存的会话 |
| `/name [name]` | 设置会话显示名称，省略时显示当前名称 |
| `/session` | 显示当前会话信息和统计信息 |
| `/tree` | 浏览会话树 |
| `/fork` | 从较早的用户消息创建新会话 |
| `/clone` | 在当前会话的当前位置复制该会话 |
| `/compact [instructions]` | 压缩当前上下文，可选使用自定义指令 |
| `/import <path>` | 导入并恢复 JSONL 会话 |

## 导出与分享｜ Export and share

| 命令 | 描述 |
|---|---|
| `/copy` | 复制最后一条助手消息 |
| `/export [path]` | 将会话导出为 HTML 或 JSONL |
| `/share` | 上传会话并返回查看器链接 |
| `/bug [description]` | 为 Pi 开发者准备一份私密缺陷报告 |

在导出或分享会话之前先审查会话。会话可能包含提示词、工具参数、命令输出、文件内容以及对话过程中暴露的凭据。

## 运行时与项目｜ Runtime and project

| 命令 | 描述 |
|---|---|
| `/trust` | 为未来的 Pi 进程保存项目信任决定 |
| `/reload` | 重新加载键位绑定、扩展、技能、模板、主题和上下文文件 |
| `/hotkeys` | 显示当前生效的键盘快捷键 |
| `/changelog` | 显示更新日志条目 |
| `/quit` | 退出 Pi |

## 由资源添加的命令｜ Commands added by resources

- 扩展可以注册带有自身参数和补全行为的命令。
- 每个提示词模板都可通过其模板名称使用。
- 当技能命令启用时，技能以 `/skill:name` 的形式提供。

在添加或更改已发现的命令资源后，使用 `/reload`。有关其加载和命名规则，请参阅 [Extensions](extensions.md)、[Prompt Templates](prompt-templates.md) 和 [Skills](skills.md)。
