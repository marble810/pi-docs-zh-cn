> pi 可以创建提示词模板。请让它为你的工作流构建一个。

# 提示词模板｜ Prompt Templates

提示词模板是 Markdown 片段，可扩展为完整的提示词。在编辑器中输入 `/name` 来调用模板，其中 `name` 是不含 `.md` 的文件名。

## 位置｜ Locations

Pi 从以下位置加载提示词模板：

- 全局：`~/.pi/agent/prompts/*.md`
- 项目：`.pi/prompts/*.md` (仅当项目被信任后)
- 包：`prompts/` 目录或 `package.json` 中的 `pi.prompts` 条目
- 设置：`prompts` 数组，包含文件或目录
- CLI：`--prompt-template <path>` (可重复)

通过 `--no-prompt-templates` 禁用发现功能。

## 格式｜ Format

```markdown
---
description: Review staged git changes
---
Review the staged changes (`git diff --cached`). Focus on:
- Bugs and logic errors
- Security issues
- Error handling gaps
```

- 文件名即命令名。`review.md` 变为 `/review`。
- `description` 是可选的。如果缺失，则使用第一行 non-empty。
- `argument-hint` 是可选的。设置后，提示会在自动补全下拉菜单中显示在描述之前。

### 参数提示｜ Argument Hints

在 frontmatter 中使用 `argument-hint` 来显示自动补全中的预期参数。使用 `<angle brackets>` 表示必需参数，`[square brackets]` 表示可选参数：

```markdown
---
description: Review PRs from URLs with structured issue and code analysis
argument-hint: "<PR-URL>"
---
```

在自动补全下拉菜单中呈现为：

```
→ pr   <PR-URL>       — Review PRs from URLs with structured issue and code analysis
  is   <issue>        — Analyze GitHub issues (bugs or feature requests)
  wr   [instructions] — Finish the current task end-to-end
  cl   — Audit changelog entries before release
```

## 用法｜ Usage

在编辑器中输入 `/` 后跟模板名称。自动补全会显示可用模板及其描述。

```
/review                           # Expands review.md
/component Button                 # Expands with argument
/component Button "click handler" # Multiple arguments
```

## 参数｜ Arguments

模板支持位置参数、默认值和简单的切片操作：

- `$1`、`$2`…位置参数
- `$@` 或 `$ARGUMENTS` 用于所有参数连接在一起
- 当存在参数 1 时，`${1:-default}` 使用它/non-empty，否则使用 `default`
- 当存在所有参数时，`${@:-default}` 或 `${ARGUMENTS:-default}` 使用它们/non-empty，否则使用 `default`
- `${@:N}` 用于从第 N 个位置开始的参数（(从 1 开始索引)）
- `${@:N:L}` 用于从 N 开始的 `L` 个参数

示例：

```markdown
---
description: Create a component
---
Create a React component named $1 with features: $@
```

默认值对于可选参数很有用：

```markdown
Summarize the current state in ${1:-7} bullet points.
```

用法：`/component Button "onClick handler" "disabled support"`

## 加载规则

- `prompts/` 中的模板发现是 non-recursive。
- 如果需要在子目录中使用模板，请通过 `prompts` 设置或包清单显式添加它们。
