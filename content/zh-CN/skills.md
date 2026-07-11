>

#

Pi implements the [Agent Skills standard](https://agentskills.io/specification), warning about most violations but remaining lenient. Pi allows skill 名称s to differ from their parent directory even though the standard disallows it; that rule is suboptimal for shared skill directories used across multiple agent harnesses.

##

- [ons)
- [技能的工作原理ork)
- [技能命令nds)
- [技能结构ure)
- [Frontmatterter)
- [验证ion)
- [示例ple)
- [技能仓库ies)

## Locations

> **Security:** Skills can instruct the model to perform any action and may include executable code the model invokes. Review skill content before use.

- Global:
  - `~/.pi/agent/skills/`
  - `~/.agents/skills/`
- Project (only after the project is trusted):
  - `.pi/skills/`
  - `.agents/skills/` in `cwd` and ancestor directories (up to git repo root, or filesystem root when not in a repo)
- Packages: `skills/` directories or `pi.skills` entries in `package.json`
- Settings: `skills` array with files or directories
- CLI: `--skill <path>` (repeatable, additive even with `--no-skills`)

- In `~/.pi/agent/skills/` and `.pi/skills/`, direct root `.md` files are discovered as individual skills
- In all skill locations, directories containing `SKILL.md` are discovered recursively
- In `~/.agents/skills/` and project `.agents/skills/`, root `.md` files are ignored

Disable discovery with `--no-skills` (explicit `--skill` paths still load).

### 使用来自其他代理运行框架的技能

要使用来自 Claude Code 或 OpenAI Codex 的技能，请将其目录添加到配置中：

```json
{
  "skills": ["~/.claude/skills", "~/.codex/skills"]
}
```

For project-level Claude Code skills, add to `.pi/settings.json`:

```json
{
  "skills": ["../.claude/skills"]
}
```

## How Skills Work

1. 启动时， pi 会扫描技能位置并提取名称和描述ystem prompt includes available skills in XML format per the [specification](https://agentskills.io/integrate-skills)
2. When a task matches, the agent uses `read` to load the full SKILL.md (models don't always do this; use prompting or `/skill:name` to force it)
3. 代理会遵循指令，使用相对路径引用脚本和资源

这是一种渐进式披露：只有描述始终在上下文中，完整指令按需加载。

## Skill Commands

Skills register as `/skill:name` commands:

```bash
/skill:brave-search           # Load and execute the skill
/skill:pdf-tools extract      # Load skill with arguments
```

Arguments after the command are appended to the skill content as `User: <args>`.

Toggle skill commands via `/settings` in interactive mode or in `settings.json`:

```json
{
  "enableSkillCommands": true
}
```

## Skill Structure

A skill is a directory with a `SKILL.md` file. Everything else is freeform.

```
my-skill/
├── SKILL.md              # 是否必需: frontmatter + instructions
├── scripts/              # Helper scripts
│   └── process.sh
├── references/           # Detailed docs loaded on-demand
│   └── api-reference.md
└── assets/
    └── template.json
```

### 技能。md 格式

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

使用相对于技能目录的相对路径：

```markdown
See [the reference guide](references/REFERENCE.md) for details.
```

## Frontmatter

Per the [Agent Skills specification](https://agentskills.io/specification#frontmatter-required):

| 字段                       | Required                                                                                                                                       | 描述                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `name`                     | 是 最长 64 个字符。仅限小写字母 a-z、数字 0-9 和连字符。与标准不同， Pi 不要求此名称与父目录匹配，因为该标准要求对于共享技能目录而言并非最优。 |
| `description`              | Yes                                                                                                                                            | 最长 1024 个字符。描述技能的功能及使用时机。                                   |
| `许可证`                   | 否可证名称或对捆绑文件的引用。                                                                                                                 |
| `兼容性`                   | No                                                                                                                                             | 最长 500 个字符。环境要求。                                                    |
| `元数据`                   | No                                                                                                                                             | 任意键值对映射。                                                               |
| `allowed-tools`            | No                                                                                                                                             | 以空格分隔的预批准工具列表（实验性）。                                         |
| `disable-model-invocation` | No                                                                                                                                             | When `true`, skill is hidden from system prompt. Users must use `/skill:name`. |

### 命名规则

- 1-64 个字符
- 仅限小写字母、数字和连字符
- 不得以连字符开头或结尾
- 不得包含连续连字符
  Pi 不要求名称与父目录匹配。代理 Skills 标准有此要求，但该要求对于多个工具使用的共享技能目录而言并非最佳选择。

Valid: `pdf-processing`, `data-analysis`, `code-review`
Invalid: `PDF-Processing`, `-pdf`, `pdf--processing`

### 描述最佳实践

描述决定了代理何时加载该技能。请务必具体明确。

良好示例：

```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents.
```

不佳示例：

```yaml
description: Helps with PDFs.
```

## Validation

Pi 根据 代理 Skills 标准验证技能。大多数问题会产生警告，但仍会加载技能：

- 名称超过 64 个字符或包含无效字符
- 名称以连字符开头/结尾或包含连续连字符
- 描述超过 1024 个字符

未知的 frontmatter 字段将被忽略。

**Exception:** Skills with missing description are not loaded.

名称冲突（来自不同位置的相同名称）会发出警告，并保留首先找到的技能。

## Example

```
brave-search/
├── SKILL.md
├── search.js
└── content.js
```

**技能。md ：**

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

## Skill Repositories

- [Anthropic Skills](https://github.com/anthropics/skills) - Document processing (docx, pdf, pptx, xlsx), web development
- [Pi Skills](https://github.com/badlogic/pi-skills) - Web search, browser automation, Google APIs, transcription
