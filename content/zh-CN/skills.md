# 技能｜ Skills

技能为 Pi 提供针对特定类型工作的专门指令和支持文件。Pi 会按名称和描述公布每个可用的技能，然后仅在任务需要时才加载其完整指令。

当工作流需要的上下文比提示词模板更多，但不需要新的可执行集成点时，请使用技能。技能可以在其指令旁捆绑脚本、参考资料和资源。

Pi 实现了 [代理 Skills 规范](https://agentskills.io/specification)。大多数无效字段会产生警告，而不会阻止启动。

## 创建技能｜ Create a 技能

技能是一个包含 `SKILL.md` 的目录：

```text
pdf-tools/
├── SKILL.md
├── scripts/
│   └── extract.sh
├── references/
│   └── formats.md
└── assets/
    └── template.json
```

以 frontmatter 开头，后跟直接指令来启动 `SKILL.md`：

```markdown
---
name: pdf-tools
description: Extract text and tables from PDF files. Use when reading, converting, or inspecting PDFs.
---

# PDF tools

Read `references/formats.md` before converting a document. Run scripts relative to this skill directory.
```

描述决定了模型何时考虑加载该技能。请同时说明该技能做什么以及何时适用。避免使用诸如“Helps with PDFs”之类的描述，因为它们没有提供足够的路由信息。

在引用捆绑文件时，请使用相对于技能目录的相对路径。Pi 会告诉模型该技能所在的位置，以便它能够解析这些路径。

## 了解技能如何加载｜ Understand how skills load

启动时，Pi 会扫描配置的技能位置，并将每个技能的名称、描述和路径添加到系统提示词中。它不会添加完整指令。

当任务匹配时，模型会读取 `SKILL.md` 并遵循其指令。这样可以将详细指导保留在上下文之外，直到需要时才使用。模型可能无法加载相关技能，因此当你需要强制加载时，请使用 `/skill:name`。

`/skill:name` 之后的参数会作为用户请求追加到已加载的指令中：

```text
/skill:pdf-tools extract report.pdf
```

当技能只应通过其显式命令可用时，在 frontmatter 中设置 `disable-model-invocation: true`。`enableSkillCommands` [setting](settings.md) 控制技能命令是否出现在交互式命令发现中；手动输入的 `/skill:name` 命令仍然有效。

<a id="choose-where-it-loads"></a>

## 将其添加到 Pi

将技能放入你的用户或项目技能目录中。包含 `SKILL.md` 的目录会被递归发现。

Pi 还支持 代理 Skills 位置 `~/.agents/skills/` 和 `.agents/skills/`。项目 `.agents/skills/` 目录会从工作目录向上逐级发现，直到仓库根目录（如果存在）为止。

Pi 接受一些独立的 Markdown 技能，但包含 `SKILL.md` 的目录是可移植形式，应优先使用。有关其他位置，请参阅 [Settings](settings.md#resources) 和 [Pi Packages](packages.md)。

项目技能可以指示模型运行脚本或修改文件。在授予项目信任之前，请审查不熟悉的技能及其支持文件。

## 编写可移植的 frontmatter ｜ Write portable frontmatter

代理 Skills 规范定义了以下字段：

| 字段 | 用途 |
|---|---|
| `name` | 命令和显示名称 |
| `description` | 向模型显示的路由描述 |
| `license` | 许可证名称或捆绑的许可证文件 |
| `compatibility` | 环境要求 |
| `metadata` | 额外的 key-value 元数据 |
| `allowed-tools` | 实验性 pre-approved 工具列表 |
| `disable-model-invocation` | 对自动模型选择隐藏该技能 |

名称使用小写字母、数字和连字符，且不得以连字符开头、结尾或连续出现。名称最多可包含 64 个字符；描述最多可包含 1024 个字符。

Pi 在声明的名称与父目录不同时既不要求也不警告。其他 代理 Skills 实现可能会强制执行该要求，因此名称保持一致仍是更具可移植性的选择。

格式错误的 `SKILL.md` 文件以及未声明描述的技能不会被加载。名称冲突时保留最先发现的技能并产生警告。

## 验证并分享技能

在可发现该技能的位置运行 Pi，然后检查启动诊断信息和 `/skill:name` 命令。在活动会话期间编辑技能后，运行 `/reload`。

使用 [Pi 包](packages.md) 通过 npm or git 分发一个或多个技能。将环境设置保留在技能内部，并在包中声明任何所需的运行时依赖项。

有关示例，请参阅 [Anthropic 技能集合](https://github.com/anthropics/skills) 和 [Pi 技能集合](https://github.com/badlogic/pi-skills)。
