# 提示词模板｜ Prompt Templates

提示词模板将 Markdown 文件转换为可复用的 `/` 命令。当你希望复用同一个提示词，而不添加可执行行为或更大的一组辅助指令时，可以使用它。

模板可以接受参数并出现在命令补全中。Pi 可以从个人配置、项目配置、显式路径或 Pi 包中加载模板。项目配置仅在授予项目信任后才会加载。

## 创建模板

创建 `~/.pi/agent/prompts/review.md`：

```markdown
---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes. Focus on ${1:-correctness, security, and error handling}.
```

文件名会成为命令名，因此此模板可作为 `/review` 使用。`description` 会出现在命令补全中。如果省略它，Pi 会使用第一行 non-empty。

`argument-hint` 是可选的。使用 `<angle brackets>` 表示必需参数，使用 `[square brackets]` 表示可选参数。

在活动会话中添加或更改模板后，运行 `/reload`。

<a id="invoke-a-template"></a>

## 使用模板

在编辑器中输入模板命令：

```text
/review
/review concurrency
```

Pi 会在生成的文本进入代理之前展开模板。除非有同名扩展命令处理它，否则扩展会先通过 `input` 事件接收原始输入。

模板支持以下替换：

| 语法 | 结果 |
|---|---|
| `$1`、`$2`、… | 一个位置参数 |
| `$@` 或 `$ARGUMENTS` | 所有参数以空格连接 |
| `${1:-default}` | 第一个参数，或默认值 |
| `${@:-default}` | 所有参数，或默认值 |
| `${@:N}` | 从位置 `N` 开始的参数 |
| `${@:N:L}` | 从位置 `N` 开始的 `L` 个参数 |

参数遵循 shell-like 的引号规则，因此 `/review "API compatibility"` 提供一个包含空格的参数。

<a id="choose-where-it-loads"></a>

## 将其添加到 Pi

将模板放入你的用户或项目提示词目录。常规提示词目录仅加载直接的 `.md` 子项。

设置和包可以选择嵌套的 Markdown 文件；包清单可以通过显式路径和 glob 缩小发现范围。有关这些选项，请参阅 [Settings](settings.md#resources) 和 [Pi Packages](packages.md)。

授予信任后，项目模板会成为编辑器中的命令。在信任不熟悉的项目之前，请审查其内容。请参阅 [Security](security.md#understand-project-trust)。
