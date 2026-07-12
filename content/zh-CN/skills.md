> pi 可以创建技能。让它为您构建一个适合您使用场景的技能。

# 技能

技能是 self-contained 能力包，代理会加载 on-demand 来使用。一个技能为特定任务提供专门的工作流、设置说明、辅助脚本和参考文档。

Pi 实现了 [代理 Skills 标准](https://agentskills.io/specification)，对大多数违规行为会发出警告但保持宽松。Pi 允许技能名称与其父目录不同，尽管标准禁止这样做；该规则对于跨多个代理运行框架使用的共享技能目录而言并非最优。

## 目录

- [位置](#locations)
- [技能如何工作](#how-skills-work)
- [技能命令](#skill-commands)
- [技能结构](#skill-structure)
- [前置元数据](#frontmatter)
- [验证](#validation)
- [示例](#example)
- [技能仓库](#skill-repositories)

## 位置

> **安全：** 技能可以指示模型执行任何操作，并可能包含模型调用的可执行代码。使用前请审核技能内容。

Pi 从以下位置加载技能：

- 全局：
  - `~/.pi/agent/skills/`
  - `~/.agents/skills/`
- 项目 (仅在项目被信任后)：
  - `.pi/skills/`
  - `.agents/skills/` 位于 `cwd` 及其祖先目录 (向上至 git repo 根目录，或不在仓库中时至文件系统根目录)
- 包：`skills/` 目录或 `pi.skills` 条目（在 `package.json` 中）
- 设置：`skills` 数组，包含文件或目录
- CLI：`--skill <path>` (可重复，即使有 `--no-skills` 也是累加的)

发现规则：

- 在 `~/.pi/agent/skills/` 和 `.pi/skills/` 中，直接的根目录 `.md` 文件会被发现为单个技能
- 在所有技能位置中，包含 `SKILL.md` 的目录会被递归发现
- 在 `~/.agents/skills/` 和项目 `.agents/skills/` 中，根目录下的 `.md` 文件会被忽略

通过 `--no-skills` 禁用自动发现，(显式指定的 `--skill` 路径仍然会加载)。

### 使用其他运行框架的技能

要使用来自 Claude Code 或 OpenAI Codex 的技能，请将其目录添加到设置中：

```json
{
  "skills": ["~/.claude/skills", "~/.codex/skills"]
}
```

对于 project-level Claude Code 技能，请添加到 `.pi/settings.json`：

```json
{
  "skills": ["../.claude/skills"]
}
```

## 技能工作原理

1. 启动时， pi 会扫描技能位置并提取名称和描述
2. 系统提示词中包含可用技能，格式为 XML，遵循 [规范](https://agentskills.io/integrate-skills)
3. 当任务匹配时，代理使用 `read` 加载完整的 SKILL.md (模型并不总是这样做；请通过提示或使用 `/skill:name` 强制加载)
4. 代理按照指令操作，使用相对路径引用脚本和资源

这是渐进式披露：只有描述始终在上下文中，完整指令在 on-demand 时加载。

## 技能命令

技能注册为 `/skill:name` 命令：

```bash
/skill:brave-search           # Load and execute the skill
/skill:pdf-tools extract      # Load skill with arguments
```

命令后的参数会作为 `User: <args>` 附加到技能内容中。

在交互模式或 `settings.json` 中通过 `/settings` 切换技能命令：

```json
{
  "enableSkillCommands": true
}
```

## 技能结构

技能是一个包含 `SKILL.md` 文件的目录。其余内容可以自由组织。

```
my-skill/
├── SKILL.md              # Required: frontmatter + instructions
├── scripts/              # Helper scripts
│   └── process.sh
├── references/           # Detailed docs loaded on-demand
│   └── api-reference.md
└── assets/
    └── template.json
```

### SKILL.md 格式

````markdown
---
name: my-skill
description: What this skill does and when to use it. Be specific.
---

# My Skill

## Setup

Run once before first use:

```bash
cd /path/to/skill && npm install
```

## Usage

```bash
./scripts/process.sh <input>
```
````

使用相对于技能目录的路径：

```markdown
See [the reference guide](references/REFERENCE.md) for details.
```

## 前置元数据

根据 [代理技能规范](https://agentskills.io/specification#frontmatter-required)：

| 字段                       | 必需 | 描述                                                                                                                     |
| -------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ |
| `name`                     | 是   | 最多 64 个字符。小写a-z、0-9、连字符。与标准不同，Pi不要求此项与父目录匹配，因为该标准要求对于共享技能目录而言并非最优。 |
| `description`              | 是   | 最多 1024 个字符。描述技能的功能及使用时机。                                                                             |
| `license`                  | 否   | 许可证名称或捆绑文件的引用。                                                                                             |
| `compatibility`            | 否   | 最多 500 个字符。环境要求。                                                                                              |
| `metadata`                 | 否   | 任意的key-value映射。                                                                                                    |
| `allowed-tools`            | 否   | 空格分隔的pre-approved工具列表 (实验性)。                                                                                |
| `disable-model-invocation` | 否   | 当`true`时，技能从系统提示词中隐藏。用户必须使用`/skill:name`。                                                          |

### 名称规则

- 1-64 个字符
- 仅小写字母、数字、连字符
- 无前导/后置连字符
- 无连续连字符
  Pi不要求名称与父目录匹配。代理技能标准有此要求，但对于多工具使用的共享技能目录，该要求并非最佳。

有效：`pdf-processing`、`data-analysis`、`code-review`
无效：`PDF-Processing`、`-pdf`、`pdf--processing`

### 描述最佳实践

描述决定代理何时加载技能。请具体说明。

良好：

```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents.
```

较差：

```yaml
description: Helps with PDFs.
```

## 验证

Pi根据代理技能标准验证技能。大多数问题会生成警告，但仍会加载技能：

- 名称超过 64 个字符或包含无效字符
- 名称以连字符开头/结尾或包含连续连字符
- 描述超过 1024 个字符

未知的前置元数据字段将被忽略。

**例外：**缺少描述的技能不会被加载。

名称冲突(来自不同位置的同名)会发出警告并保留第一个找到的技能。

## 示例

```
brave-search/
├── SKILL.md
├── search.js
└── content.js
```

**SKILL.md:**

````markdown
---
name: brave-search
description: Web search and content extraction via Brave Search API. Use for searching documentation, facts, or any web content.
---

# Brave Search

## Setup

```bash
cd /path/to/brave-search && npm install
```

## Search

```bash
./search.js "query"              # Basic search
./search.js "query" --content    # Include page content
```

## Extract Page Content

```bash
./content.js https://example.com
```
````

## 技能仓库

- [Anthropic Skills](https://github.com/anthropics/skills) - 文档处理(docx, pdf, pptx, xlsx)、网页开发
- [Pi Skills](https://github.com/badlogic/pi-skills) - 网页搜索、浏览器自动化、Google APIs、转录
