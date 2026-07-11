> pi 可以创建主题。让它为你的设置构建一个。

# 主题

主题是定义 TUI 颜色的 JSON 文件。

## 目录

- [ons)
- [eme)
- [eme)
- [主题格式
- [颜色 Token
- [提示ips)

## Locations

- Built-in: `dark`, `light`
- Global: `~/.pi/agent/themes/*.json`
- Project: `.pi/themes/*.json` (only after the project is trusted)
- Packages: `themes/` directories or `pi.themes` entries in `package.json`
- Settings: `themes` array with files or directories
- CLI: `--theme <path>` (repeatable)

Disable discovery with `--no-themes`.

## Selecting a Theme

Select a theme via `/settings` or in `settings.json`:

```json
{
  "theme": "my-theme"
}
```

On first run, pi detects your terminal background and defaults to `dark` or `light`.

## Creating a Custom Theme

1.

```bash
mkdir -p ~/.pi/agent/themes
vim ~/.pi/agent/themes/my-theme.json
```

2. Define the theme with all required colors (see [Color Tokens](#color-tokens)):

```json
{
  "$schema": "https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "my-theme",
  "vars": {
    "primary": "#00aaff",
    "secondary": 242
  },
  "colors": {
    "accent": "primary",
    "border": "primary",
    "borderAccent": "#00ffff",
    "borderMuted": "secondary",
    "success": "#00ff00",
    "error": "#ff0000",
    "warning": "#ffff00",
    "弱化文本": "secondary",
    "淡化文本": 240,
    "正文": "",
    "思考块文本": "secondary",
    "选中行背景": "#2d2d30",
    "用户消息背景": "#2d2d30",
    "用户消息文本": "",
    "扩展消息背景": "#2d2d30",
    "扩展消息文本": "",
    "扩展消息标签": "primary",
    "工具调用等待背景": "#1e1e2e",
    "toolSuccessBg": "#1e2e1e",
    "toolErrorBg": "#2e1e1e",
    "toolTitle": "primary",
    "toolOutput": "",
    "mdHeading": "#ffaa00",
    "mdLink": "primary",
    "mdLinkUrl": "secondary",
    "mdCode": "#00ffff",
    "mdCodeBlock": "",
    "mdCodeBlockBorder": "secondary",
    "mdQuote": "secondary",
    "mdQuoteBorder": "secondary",
    "mdHr": "secondary",
    "mdListBullet": "#00ffff",
    "toolDiffAdded": "#00ff00",
    "toolDiffRemoved": "#ff0000",
    "toolDiffContext": "secondary",
    "syntaxComment": "secondary",
    "syntaxKeyword": "primary",
    "syntaxFunction": "#00aaff",
    "syntaxVariablefaa00",
    "syntaxString": "#00ff00",
    "syntaxNumber": "#ff00ff",
    "syntaxType": "#00aaff",
    "syntaxOperator": "primary",
    "syntaxPunctuationondary",
    "thinkingOff": "secondary",
    "thinkingMinimal": "primary",
    "thinkingLow": "#00aaff",
    "thinkingMedium": "#00ffff",
    "thinkingHigh": "#ff00ff",
    "thinkingXhigh": "#ff0000",
    "thinkingMax": "#ff0088",
    "bashMode": "#ffaa00"
  }
}
```

3. Select the theme via `/settings`.

**Hot reload:** When you edit the currently active custom theme file, pi reloads it automatically for immediate visual feedback.

## Theme Format

```json
{
  "$schema": "https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "my-theme",
  "vars": {
    "blue": "#0066cc",
    "gray": 242
  },
  "colors": {
    "accent": "blue",
    "muted": "gray",
    "text": "",
    ...
  }
}
```

- `name` is required, must be unique, and must not contain `/`.
- `vars` is optional. Define reusable colors here, then reference them in `colors`.
- `colors` must define all 51 required tokens. `thinkingMax` is optional and falls back to `thinkingXhigh`.

The `$schema` field enables editor auto-completion and validation.

## Color Tokens

Every theme must define all 51 required color tokens. `thinkingMax` is optional for compatibility with existing themes; when omitted, it uses `thinkingXhigh`.

### 核心 UI （ 11 种颜色）

| Token | 用途nt`| 主强调色（ Logo、选中项、光标） |
|`border`| 常规边框 |
|`borderAccent`| 高亮边框 |
|`borderMuted`| 弱化边框（编辑器） |
|`success`| 成功状态 |
|`error`| 错误状态 |
|`warning`| 警告状态 |
|`muted`| 次要文本 |
|`dim`| 三级文本 |
|`text`| 默认值 text (usually`""`) |
| `thinkingText` | 思考块文本 |

### 背景与内容（ 11 种颜色）

| Token                | Purpose          |
| -------------------- | ---------------- |
| `selectedBg`         | 选中行背景       |
| `userMessageBg`      | 用户消息背景     |
| `userMessageText`    | 用户消息文本     |
| `customMessageBg`    | 扩展消息背景     |
| `customMessageText`  | 扩展消息文本     |
| `customMessageLabel` | 扩展消息标签     |
| `toolPendingBg`      | 工具框（待处理） |
| `toolSuccessBg`      | 工具框（成功）   |
| `toolErrorBg`        | 工具框（错误）   |
| `toolTitle`          | 工具标题         |
| `toolOutput`         | 工具输出文本     |

### Markdown （ 10 种颜色）

| Token               | Purpose      |
| ------------------- | ------------ |
| `mdHeading`         | 标题         |
| `mdLink`            | 链接文本     |
| `mdLinkUrl`         | 链接 URL     |
| `mdCode`            | 内联代码     |
| `mdCodeBlock`       | 代码块内容   |
| `mdCodeBlockBorder` | 代码块围栏   |
| `mdQuote`           | 引用块文本   |
| `mdQuoteBorder`     | 引用块边框   |
| `mdHr`              | 水平分割线   |
| `mdListBullet`      | 列表项目符号 |

### 工具差异对比（ 3 种颜色）

| Token             | Purpose  |
| ----------------- | -------- |
| `toolDiffAdded`   | 新增行   |
| `toolDiffRemoved` | 删除行   |
| `toolDiffContext` | 上下文行 |

### 语法高亮（ 9 种颜色）

| Token               | Purpose     |
| ------------------- | ----------- |
| `syntaxComment`     | 注释        |
| `syntaxKeyword`     | 关键字      |
| `syntaxFunction`    | 函数名      |
| `syntaxVariable`    | 变量        |
| `syntaxString`      | 字符串      |
| `syntaxNumber`      | 数字        |
| `syntaxType`        | 类型        |
| `syntaxOperator`    | 运算符      |
| `syntaxPunctuation` | Punctuation |

### 思考层级边框（ 6 个必需， 1 个可选）

指示思考层级的编辑器边框颜色（视觉层次从细微到显著）：

| Token             | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `thinkingOff`     | 思考关闭                                                  |
| `thinkingMinimal` | 最小思考                                                  |
| `thinkingLow`     | 低思考                                                    |
| `thinkingMedium`  | 中等思考                                                  |
| `thinkingHigh`    | 高度思考                                                  |
| `thinkingXhigh`   | 超高思考                                                  |
| `thinkingMax`     | Maximum thinking; optional, falls back to `thinkingXhigh` |

### Bash 模式（ 1 种颜色）

| Token      | Purpose                                 |
| ---------- | --------------------------------------- |
| `bashMode` | Editor border in bash mode (`!` prefix) |

### HTML 导出（可选）

The `export` section controls colors for `/export` HTML output. If omitted, colors are derived from `userMessageBg`.

```json
{
  "export": {
    "pageBg": "#18181e",
    "cardBg": "#1e1e24",
    "infoBg": "#3c3728"
  }
}
```

## Color Values

支持四种格式：

| Format   | 示例        | 描述                           |
| -------- | ----------- | ------------------------------ |
| 十六进制 | `"#ff0000"` | 6 位十六进制 RGB               |
| 256 色   | `39`        | xterm 256 色调色板索引 (0-255) |
| Variable | `"primary"` | Reference to a `vars` entry    |
| Default  | `""`        | 终端的默认颜色                 |

### 256 色调色板

- `0-15`: Basic ANSI colors (terminal-dependent)
- `16-231`: 6×6×6 RGB cube (`16 + 36×R + 6×G + B` where R,G,B are 0-5)
- `232-255`: Grayscale ramp

### 终端兼容性

Pi 使用 24 位 RGB 颜色。大多数现代终端都支持此功能（ iTerm2、Kitty、WezTerm、Windows 终端、VS Code ）。对于仅支持 256 色的旧终端， pi 会回退到最接近的近似颜色。

检查 truecolor 支持：

```bash
echo $COLORTERM  # Should output "truecolor" or "24bit"
```

## Tips

**Dark terminals:** Use bright, saturated colors with higher contrast.

**Light terminals:** Use darker, muted colors with lower contrast.

**Color harmony:** Start with a base palette (Nord, Gruvbox, Tokyo Night), define it in `vars`, and reference consistently.

**Testing:** Check your theme with different message types, tool states, markdown content, and long wrapped text.

**VS Code:** Set `terminal.integrated.minimumContrastRatio` to `1` for accurate colors.

## 示例

查看内置主题：

- [dark.json](../src/modes/interactive/theme/dark.json)
- [light.json](../src/modes/interactive/theme/light.json)
