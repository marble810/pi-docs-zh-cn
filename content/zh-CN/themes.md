# 使用主题自定义 Pi｜ Customize with themes

主题控制 Pi 在交互模式和 HTML 导出中使用的颜色。Pi 包含 `dark` 和 `light` 主题。你可以选择一个主题、跟随终端的浅色或深色外观，或创建自己的调色板。

<a id="selecting-a-theme"></a>

## 选择主题｜ Choose a theme

打开 `/settings` 并选择 **Theme**。你可以为所有终端外观使用一个主题，或为浅色和深色终端分别选择主题。

该选择会保存为 `theme` [setting](settings.md#terminal-and-display)：

```json
{
  "theme": "dark"
}
```

自动模式先存储浅色主题，再存储深色主题：

```json
{
  "theme": "light/dark"
}
```

当自动模式处于活动状态时，Pi 会在终端报告外观变化时切换主题。主题名称不能包含 `/`，因为 Pi 将其保留用于此设置格式。

使用 `--use-theme` 为单次调用选择初始主题，而不更改已保存的设置：

```bash
pi --use-theme light
pi --use-theme light/dark
```

有关 command-line 选项，请参阅 [CLI 资源](cli.md#resources)。

## 创建自定义主题｜ Create a custom theme

复制一个 [built-in 主题](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/src/modes/interactive/theme)，或创建一个符合 [schema](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json) 的新 JSON 文件。

1. 将文件保存为 `<agent-dir>/themes/my-theme.json`。代理目录默认为 `~/.pi/agent`。
2. 将其 `name` 设置为 `my-theme`。
3. 更改 `vars` 和 `colors` 中的值。
4. 选择 `my-theme` 到 `/settings`。

使用主题名称作为文件名。Pi hot-reloads 仅从 `<agent-dir>/themes/<name>.json` 加载当前用户主题。从任何其他来源添加或更改主题后，请运行 `/reload`。

## 了解主题文件｜ Understand the theme file

| 属性 | 必需 | 作用 |
|---|---|---|
| `$schema` | 否 | 启用针对 Pi 已发布 schema 的编辑器验证和补全。 |
| `name` | 是 | 在选择器和设置中标识主题。它必须唯一，且不能包含 `/`。 |
| `vars` | 否 | 定义可复用的颜色值。变量可以引用其他变量。 |
| `colors` | 是 | 将颜色分配给终端 UI 角色。schema 标识必需和可选角色。 |
| `export` | 否 | 覆盖 HTML 导出中的页面和面板背景。 |

颜色可以用四种形式表示：

| 形式 | 示例 | 含义 |
|---|---|---|
| RGB 十六进制 | `"#00aaff"` | 一个 six-digit RGB 颜色。 |
| 256 色索引 | `39` | 从 `0` 到 `255` 的 ANSI 调色板索引。 |
| 变量引用 | `"primary"` | `vars` 中某个条目的值。 |
| 终端默认值 | `""` | 终端的默认前景色或背景色。 |

Pi 会解析链式变量引用。缺失的变量或循环引用会使主题无效。十六进制颜色在支持时使用真彩色，在仅限 256 色的终端中会被近似处理。如果颜色与其十六进制值不同，请检查终端的真彩色检测和对比度设置。参见 [Configure Your 终端](terminal-setup.md#override-detected-capabilities)。

使用 [theme JSON schema](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json) 了解确切的属性、必需的颜色以及可接受的值类型。

Pi 会在启动期间和 `/reload` 时报告无效的主题文件。

## 找到要更改的颜色

主题颜色描述的是界面角色，而不是单个组件。使用这些分组来 find the schema 的相关部分：

| 区域 | 颜色名称 |
|---|---|
| 通用界面 | `accent`, `border*`, `text`, `muted`, `dim`, `success`, `error`, `warning` |
| 选择与全屏 | `selectedBg`, `searchMatch*`, `scrollbar*` |
| 消息 | `userMessage*`, `customMessage*`, `thinkingText` |
| 工具执行 | `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`, `toolTitle`, `toolOutput` |
| Markdown | `md*` |
| 工具差异 | `toolDiff*` |
| 语法高亮 | `syntax*` |
| 编辑器模式 | `thinking*`, `bashMode` |
| HTML 导出 | `export.pageBg`, `export.cardBg`, `export.infoBg` |

该 schema 是格式参考。built-in 主题提供了完整的值，你可以复制并调整。

有五种颜色是可选的，省略时会继承另一种颜色：

| 可选颜色 | 回退 |
|---|---|
| `scrollbarTrack` | `muted` |
| `scrollbarThumb` | `text` |
| `searchMatchBg` | `selectedBg` |
| `searchMatchText` | `text` |
| `thinkingMax` | `thinkingXhigh` |

如果省略 `export` 颜色，Pi 会根据 `userMessageBg` 推导出 HTML 页面和面板背景。

## 从项目或包加载主题｜ Load a theme from a project or package

将项目主题放在 `.pi/themes/` 中。只有在授予 [项目信任](security.md#understand-project-trust) 后，项目主题才会加载。

你也可以通过 `themes` 设置加载主题文件和目录，或将它们分发到 Pi 包中。请参阅 [配置](configuration.md)、[设置](settings.md#resources) 和 [Pi 包](packages.md)。

每个加载的主题都必须具有唯一的名称。Pi 会将重复名称报告为资源冲突。
