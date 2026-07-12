> pi 可以创建提示词模板。让它为你的工作流程构建一个。

# 提示词模板

提示词模板是 Markdown 片段，可展开为完整的提示词。在编辑器中输入 `/name` 来调用模板，其中 `name` 是不带 `.md` 的文件名。

## 位置

Pi 从以下位置加载提示词模板：

- 全局：`~/.pi/agent/prompts/*.md`
- 项目：`.pi/prompts/*.md` (仅在项目受信任后)
- 包：`prompts/` 目录或 `package.json` 中的 `pi.prompts` 条目
- 设置：包含文件或目录的 `prompts` 数组
- CLI：`--prompt-template <path>` (可重复)

使用 `--no-prompt-templates` 禁用发现。

## 格式

```markdown
---
description: Review staged git changes
---

Review the staged changes (`git diff --cached`). Focus on:

- Bugs and logic errors
- Security issues
- Error handling gaps
```

- 文件名即为命令名。`review.md` 变为 `/review`。
- `description` 是可选的。如果缺失，则使用第一个 non-empty 行。
- `argument-hint` 是可选的。设置后，该提示会在自动补全下拉菜单的描述之前显示。

### 参数提示

在 frontmatter 中使用 `argument-hint` 可在自动补全中显示预期的参数。使用 `<angle brackets>` 表示必需参数，使用 `[square brackets]` 表示可选参数：

```markdown
---
description: Review PRs from URLs with structured issue and code analysis
argument-hint: "<PR-URL>"
---
```

这在自动补全下拉菜单中渲染为：

```
→ pr   <PR-URL>       — Review PRs from URLs with structured issue and code analysis
  is   <issue>        — Analyze GitHub issues (bugs or feature requests)
  wr   [instructions] — Finish the current task end-to-end
  cl   — Audit changelog entries before release
```

## 用法

在编辑器中输入 `/` 后跟模板名称。自动补全会显示带有描述的可用模板。

```
/review                           # Expands review.md
/component Button                 # Expands with argument
/component Button "click handler" # Multiple arguments
```

## 参数

模板支持位置参数、默认值和简单的切片：

- `$1`, `$2`, … 位置参数
- `$@` 或 `$ARGUMENTS` 用于所有合并的参数
- `${1:-default}` 在参数 1 存在/non-empty 时使用它，否则使用 `default`
- `${@:N}` 用于从第 N 个位置开始的参数 (索引从 1 开始)
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
- 如果你想要子目录中的模板，请通过 `prompts` 设置或包清单显式添加它们。
