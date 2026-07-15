---
version: alpha
name: Pi Docs 中文
description: Simplified Chinese technical documentation site.
colors:
  background: "#10171e"
  foreground: "rgba(213, 216, 219, 0.96)"
  surface: "#17212b"
  surface-hover: "#202c38"
  border: "rgba(73, 80, 89, 0.62)"
  primary: "#8bbdb2"
  primary-hover: "#b5ddd3"
  primary-soft: "#19342f"
  muted: "rgba(159, 164, 171, 0.78)"
  code-background: "rgba(33, 39, 48, 0.9)"
  overlay: "rgba(0, 0, 0, 0.6)"
typography:
  body:
    fontFamily: "Noto Serif SC, Georgia, Times New Roman, serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  heading:
    fontFamily: "Noto Serif SC, Georgia, Times New Roman, serif"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.25
  ui:
    fontFamily: "system-ui, Noto Sans SC, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "JetBrains Mono, SF Mono, Fira Code, Consolas, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: 0px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
components:
  control:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
  control-hover:
    backgroundColor: "{colors.surface-hover}"
  primary-action:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
  primary-action-hover:
    backgroundColor: "{colors.primary-hover}"
  secondary-text:
    textColor: "{colors.muted}"
  soft-emphasis:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  code-inline:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
  divider:
    backgroundColor: "{colors.border}"
  floating-layer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  overlay-scrim:
    backgroundColor: "{colors.overlay}"
---

# Pi Docs 中文设计契约

## Overview

这是面向长篇技术阅读的简体中文文档站。界面应克制、清晰且以内容为中心：正文使用衬线字体，操作与技术元数据使用等宽或系统无衬线字体。产品目标是 **dark mode only**：删除浅色 token、系统偏好分支与主题切换器；浅色主题不是后续 UI 工作允许扩展的主题。

## Colors

仅使用 `src/app.css` 的暗色语义变量。`primary` 用于链接、当前导航项和可交互状态；普通文字使用 `foreground`，次要文字使用 `muted`。不可在组件内硬编码颜色或引入浅色主题值。

## Typography

正文使用 `body`，标题使用 `heading`，代码与技术元数据使用 `code`。UI 控件可使用 `ui` 或现有等宽样式；不得为了装饰引入新的字体族或字重层级。

## Layout

沿用 `src/app.css` 的 4px 间距尺度以及现有文档布局变量：侧栏 220px、目录 200px、正文最大宽度 730px、页头高度 86px。现有断点为 768px、900px 与 1100px；响应式调整必须复用这些边界或先更新本契约。

## Elevation & Depth

界面以背景层、1px 边框和轻阴影区分层级；不得使用玻璃拟态或重阴影。浮层遮罩使用 `overlay` 色值，并由共享交互原语管理焦点。层级只能使用 `src/app.css` 的 `--z-header`（页头）与 `--z-overlay`（Dialog / 搜索浮层 / 抽屉）；不得在组件中写死数字 z-index。

## Shapes

所有容器、控件和浮层均为方角（`rounded.none`）。不得新增圆角例外。

## Components

- 文档页面壳、文章、侧栏和目录保持轻量 Svelte 组件。
- 不渲染 `ThemeMenu` 或其他主题切换控件；页面始终使用暗色 token。
- 文档内优先使用文本链接；每页最多一个强调色主行动，其余操作使用中性边框控件。
- Dialog、菜单、Tooltip、Popover、Select/Combobox、Accordion 与 Tabs 等复杂交互必须使用 Bits UI 或项目内基于它的共享封装。
- 一次性迁移现有 `src/lib/components/ui/` 中自管的复杂交互原语；`SearchDialog` 及其余消费者随后统一接入。其搜索数据逻辑不属于本设计契约。
- 搜索框必须通过浮层 portal 以 `position: fixed` 渲染，水平居中于页头下方且处于普通文档流之外；不得挤压或重新排列页面内容。
- 在 ≤768px，移动导航必须由 Bits UI Dialog 实现为可关闭、可键盘操作的抽屉或对话框，并复用现有移动导航内容。
- 禁止新增或保留自管 portal、focus trap、Esc 关闭、浮层定位或下拉菜单逻辑。
- 交互控件须具备可见焦点、键盘可操作性和语义化名称；`prefers-reduced-motion` 必须继续生效。
- 本轮只规范现有的 hover、focus、warning 与 success 状态；仅在出现真实控件需求时，才新增 error 或 disabled token。

## Do's and Don'ts

- Do 使用 `src/app.css` 的语义 CSS 变量与既有间距尺度。
- Do 在深色主题内验证文本、边框、焦点和 hover 的可读性。
- Don't 新建浅色主题或写入浅色主题专属值。
- Don't 硬编码颜色、间距、圆角、阴影或动效时长；z-index 只能引用 `--z-header` / `--z-overlay`。
- Don't 创建 feature-local 基础控件或绕开共享浮层原语。
- Don't 把搜索、导航或内容数据逻辑混入纯视觉归一化。
