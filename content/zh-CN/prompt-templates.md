> pi 可以创建提示词模板。让它为你的工作流构建一个。

# 提示词模板

Prompt templates are Markdown snippets that expand into full prompts. Type `/name` in the editor to invoke a template, where `name` is the filename without `.md`.

## 位置

Pi 从以下位置加载提示词模板：

- Global: `~/.pi/agent/prompts/*.md`
- Project: `.pi/prompts/*.md` (only after the project is trusted)
- Packages: `prompts/` directories or `pi.prompts` entries in `package.json`
- Settings: `prompts` array with files or directories
- CLI: `--prompt-template <path>` (repeatable)

Disable discovery with `--no-prompt-templates`.

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

- The filename becomes the command name. `review.md` becomes `/review`.
- `description` is optional. If missing, the first non-empty line is used.
- `argument-hint` is optional. When set, the hint is displayed before the description in the autocomplete dropdown.

### 参数提示

Use `argument-hint` in frontmatter to show expected arguments in autocomplete. Use `<angle brackets>` for required arguments and `[square brackets]` for optional ones:

```markdown
---
description: Review PRs from URLs with structured issue and code analysis
argument-hint: "<PR-URL>"
---
```

在自动补全下拉列表中渲染为：

```
→ pr   <PR-URL>       — Review PRs from URLs with structured issue and code analysis
  is   <issue>        — Analyze GitHub issues (bugs or feature requests)
  wr   [instructions] — Finish the current task end-to-end
  cl   — Audit changelog entries before release
```

## 用法

Type `/` followed by the template name in the editor. Autocomplete shows available templates with descriptions.

```
/review                           # Expands review.md
/component Button                 # Expands with argument
/component Button "click handler" # Multiple arguments
```

## 参数

- `$1`, `$2`, ... positional args
- `$@` or `$ARGUMENTS` for all args joined
- `${1:-default}` uses arg 1 when present/non-empty, otherwise `default`
- `${@:N}` for args from the Nth position (1-indexed)
- `${@:N:L}` for `L` args starting at N

```markdown
---
description: Create a component
---

Create a React component named $1 with features: $@
```

```markdown
Summarize the current state in ${1:-7} bullet points.
```

Usage: `/component Button "onClick handler" "disabled support"`

##

- Template discovery in `prompts/` is non-recursive.
- If you want templates in subdirectories, add them explicitly via `prompts` settings or a package manifest.
