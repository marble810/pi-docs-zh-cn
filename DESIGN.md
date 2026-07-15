---
version: alpha
name: Pi Docs 中文
description: Simplified Chinese technical documentation site. Single dark theme only.
colors:
  background: "#10171e"
  foreground: "rgba(213, 216, 219, 0.96)"
  surface: "#17212b"
  surface-hover: "#202c38"
  border: "rgba(73, 80, 89, 0.62)"
  primary: "#8bbdb2"
  primary-hover: "#b5ddd3"
  primary-soft: "#19342f"
  on-primary: "#10171e"
  muted: "rgba(159, 164, 171, 0.78)"
  code-background: "rgba(33, 39, 48, 0.9)"
  code-foreground: "rgba(213, 216, 219, 0.8)"
  toc-active: "#a4d3c8"
  warning-background: "#3a2d12"
  warning-border: "#766128"
  warning-foreground: "#e5cd7c"
  success-background: "#173b30"
  success-border: "#396d5d"
  overlay: "rgba(0, 0, 0, 0.6)"
typography:
  body:
    fontFamily: "Noto Serif SC, Georgia, Times New Roman, serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  heading:
    fontFamily: "Noto Serif SC, Georgia, Times New Roman, serif"
    fontSize: 42px
    fontWeight: 400
    lineHeight: 1.25
  ui:
    fontFamily: "system-ui, Noto Sans SC, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  chrome:
    fontFamily: "JetBrains Mono, SF Mono, Fira Code, Consolas, monospace"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "JetBrains Mono, SF Mono, Fira Code, Consolas, monospace"
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.55
rounded:
  none: 0px
spacing:
  px: 1px
  0.5: 2px
  1: 4px
  1.5: 6px
  2: 8px
  2.5: 10px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
layout:
  sidebar-width: 220px
  toc-width: 200px
  content-max-width: 730px
  layout-max-width: 1440px
  docs-cluster-width: "sidebar + content + toc + 2×16px gaps"
  panel-gap: 16px
  header-height: 86px
  search-max-width: 560px
  drawer-width: 320px
  breakpoints: [640, 768, 900, 1100]
components:
  framed-panel:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.surface}"
  control:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
  control-hover:
    backgroundColor: "{colors.surface-hover}"
  primary-action:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  primary-action-hover:
    backgroundColor: "{colors.primary-hover}"
  secondary-text:
    textColor: "{colors.muted}"
  soft-emphasis:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  code-inline:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.code-foreground}"
    rounded: "{rounded.none}"
  divider:
    backgroundColor: "{colors.border}"
  floating-layer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  overlay-scrim:
    backgroundColor: "{colors.overlay}"
  warning:
    backgroundColor: "{colors.warning-background}"
    textColor: "{colors.warning-foreground}"
  onboarding-hero:
    typography: "{typography.heading}"
    textColor: "{colors.foreground}"
  onboarding-meta-card:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
  onboarding-disclaimer:
    rounded: "{rounded.none}"
    backgroundColor: "{colors.warning-background}"
    textColor: "{colors.warning-foreground}"
---

# Pi Docs 中文设计契约

## Overview

这是面向长篇技术阅读的简体中文文档站。界面应克制、清晰且以内容为中心：正文使用衬线字体，操作与技术元数据使用等宽或系统无衬线字体。产品目标是 **dark mode only**：删除浅色 token、系统偏好分支与主题切换器；浅色主题不是后续 UI 工作允许扩展的主题。

## Colors

单暗色主题。仅使用 `src/app.css` 的语义变量（`--color-*`）。`primary`/`accent` 用于链接、当前导航与可交互状态；主按钮文字用 `on-primary`（`--color-on-accent`）；普通文字 `foreground`，次要 `muted`。warning / success / toc-active 已收录。组件内禁止硬编码颜色与 `white`/`black` 字面量。

## Typography

正文 `body`（`--text-body` 18px），大标题 `heading`（`--text-h1`），UI `ui`（`--text-sm`），页头/侧栏标签 `chrome`（`--text-overline` / mono），代码 `code`（`--text-code-sm`）。字号、字距、行高一律走 token（`--text-*`、`--tracking-*`、`--leading-*`）。

## Layout

间距走 4px 尺度（含半步 `--space-0-5` / `--space-1-5` / `--space-2-5`）。布局变量：侧栏 220、TOC 200、正文 730、页宽 1440、页头 86、搜索 560、抽屉 320。断点字面量仅允许 640 / 768 / 900 / 1100。

文档页三栏（侧栏 / 正文 / TOC）与页头共享居中集群：列间距 `--space-4`（16px），集群宽度 `--docs-cluster-width`（三栏 + 两缝）；页头内框与三栏同宽居中，相对视口水平居中。≤1100 时集群退为侧栏+正文两栏宽度；≤768 仅正文框保留，页头内框拉满可用宽。

## Elevation & Depth

界面以背景层、1px 边框和轻阴影区分层级；不得使用玻璃拟态或重阴影。文档页的页头内框、侧栏、正文、TOC 使用 `framed-panel`：`surface` 底 + `1px border`，贴在 `background` 页底上形成分区。浮层遮罩使用 `overlay` 色值，并由共享交互原语管理焦点。层级只能使用 `src/app.css` 的 `--z-header`（页头）与 `--z-overlay`（Dialog / 搜索浮层 / 抽屉）；不得在组件中写死数字 z-index。

## Shapes

所有容器、控件和浮层均为方角（`rounded.none`）。不得新增圆角例外。

## Components

- 双语标题块 `BilingualTitle`（`中文|English`）：渲染分隔符使用半角 `|`。内容文件中全角 `｜` 与半角 `|` 均被识别为分隔符。`group`/`nav`/`inline` 保持行内「中文|en」（en 小一档 + muted）；分隔符左右无额外 margin。侧栏 `nav` 英文用 `--text-xs`（比中文再小一档）。`display`（页 H1）为上下结构——上方中文主标题（`--color-fg`），下方更小更暗的英文（`--color-muted`）。Markdown H1 由 `rehypeBilingualH1` 输出同结构。
- 页头 `SiteHeader`：logo 为 `static/icon.svg`（30×30，源自 favicon.svg 的 Pi 像素图标），无文字标题或 badge。内框使用 `framed-panel` 包框 + 渐变背景 `linear-gradient(180deg, var(--color-surface-hover), var(--color-surface))`（上亮下暗）。页头内框、侧栏列、正文列、TOC 列统一 `framed-panel` 包框；侧栏与 TOC 在桌面 sticky 贴顶。
- 侧栏 `DocsSidebar`：中文标题文字（`.bilingual-title__zh`）使用 `--color-fg`（白色），英文部分保持 `--color-muted`。
- 文档页面壳、文章、侧栏和目录保持轻量 Svelte 组件。
- 不渲染 `ThemeMenu` 或其他主题切换控件；页面始终使用暗色 token。
- 文档内优先使用文本链接；每页最多一个强调色主行动，其余操作使用中性边框控件。
- Dialog、菜单、Tooltip、Popover、Select/Combobox、Accordion 与 Tabs 等复杂交互必须使用 Bits UI 或项目内基于它的共享封装。
- 一次性迁移现有 `src/lib/components/ui/` 中自管的复杂交互原语；`SearchDialog` 及其余消费者随后统一接入。其搜索数据逻辑不属于本设计契约。
- 搜索框以 inline 模式直接内嵌在 `SiteHeader` 右侧（`flex: 1; max-width: 360px`），输入即搜，结果下拉展示。`SearchDialog` 通过 `inline` prop 切换 popup dialog 与内嵌两种模式。搜索逻辑使用 MiniSearch 客户端索引。
- 在 ≤768px，移动导航必须由 Bits UI Dialog 实现为可关闭、可键盘操作的抽屉或对话框，并复用现有移动导航内容。
- 禁止新增或保留自管 portal、focus trap、Esc 关闭、浮层定位或下拉菜单逻辑。
- 交互控件须具备可见焦点、键盘可操作性和语义化名称；`prefers-reduced-motion` 必须继续生效。
- 本轮只规范现有的 hover、focus、warning 与 success 状态；仅在出现真实控件需求时，才新增 error 或 disabled token。

## Onboarding Page（站点入门）

**路由**：`/`（`src/routes/+page.svelte`）。这是访客进入中文文档站的第一屏，不是文档三栏布局的一部分；不渲染 `DocsSidebar` / `DocsToc`，仅使用根布局的 `SiteHeader` + `main` + `SiteFooter`。

**目标**：在 30 秒内说明「这是什么站、与官方关系、如何开始读文档、如何反馈翻译问题」，并给出一条明确的阅读路径。

**信息架构（自上而下，单栏居中）**

| 区块       | 职责       | 内容约束                                                                                                                                                                                                              |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero       | 身份与价值 | 站点图标（`static` favicon mask）、主标题「Pi 中文文档」、一句副标题（社区翻译定位）。主标题可用纯文本 H1；若展示双语，使用 `BilingualTitle` 的 `display`（中文在上、英文在下 muted）。                               |
| 行动区     | 转化       | **唯一** `primary-action`：「开始阅读」→ `{base}/docs/latest/`。其余为 `control` 边框按钮：源站（`meta.sourceSite` 或 `https://pi.dev/docs/latest`）、GitHub 仓库。每页仅一个强调色主行动。                           |
| 同步元数据 | 信任       | 可选网格卡片（`onboarding-meta-card`）：上游来源、同步提交短 hash、最后同步日期、可选翻译模型。数据来自 `PageData.meta` / `syncMeta`，缺省显示「—」。标签用 `chrome` 尺度（uppercase + `tracking-label` + `muted`）。 |
| 声明区     | 合规       | 两张 `onboarding-disclaimer`（warning 语义）：非官方声明、自动翻译说明；文内链接用 `primary` 色文本链接，不额外加按钮。保留 `data-testid="disclaimer"` 供 E2E。                                                       |

**布局与响应式**

- 外层 `.home`：`max-width: var(--content-max-width)`，水平居中，`padding` 使用 `--space-8` / `--space-4`。
- Hero：居中排版；桌面 `padding` 顶部 `--space-16`；行动区 `flex` + `gap: --space-4`，`justify-content: center`。
- 元数据：`grid`，`minmax(180px, 1fr)`，`gap: --space-4`。
- 声明：单列 `grid`，`gap: --space-4`。
- 断点 ≤640：行动区改为纵向堆叠、全宽按钮；元数据网格改为单列。不得引入文档页的 `--docs-cluster-width` 三栏逻辑。

**组件与样式边界**

- 面板与卡片：`rounded.none`（`--radius-*` 均为 0），`1px` `border` + `surface` 底；禁止 `border-radius` 非零值（现有首页实现待 `mabo-design-normalize` 对齐）。
- 按钮：主行动映射 `primary-action` / hover `primary-action-hover`；次行动映射 `control` + `control-hover`。
- 不新增 ThemeMenu、不嵌入搜索实现细节（搜索仍由 `SiteHeader` + `SearchDialog` 全局提供）。
- 不复制文档正文 Markdown；深度阅读一律进入 `/docs/latest/…`。

**建议阅读路径（文案/链接，非独立路由）**

1. 开始阅读 → 文档索引 `/docs/latest/`
2. 新用户优先：`quickstart.md`（快速入门｜Quickstart）
3. 日常参考：`usage.md`、`settings.md`
4. 进阶：`extensions.md`、`skills.md`

侧栏文案已含 `中文｜English`；onboarding 页内链接标题可用中文，不必强制 `BilingualTitle`。

**无障碍与 SEO**

- 单页唯一 `h1`（Hero 标题）；区块标题 `h3`。
- 图标装饰 `aria-hidden="true"`；外链 `rel="noopener"` + `target="_blank"`。
- `<svelte:head>`：`title`「Pi 中文文档 — 社区翻译」；`description` 简述社区翻译定位。
- 交互控件继承全局焦点环；遵守 `prefers-reduced-motion`。

**验证期望（实现后）**

- `pnpm check`、`pnpm test:e2e`（含 `homepage.spec.ts`、首页 a11y）。
- 视觉对照：暗色 token、方角、单主 CTA、warning 声明可读性。

**实现状态**：契约已定义；`+page.svelte` 仍含历史圆角类名，归一化阶段按本节与 Shapes 统一。

## Do's and Don'ts

- Do 使用 `src/app.css` 的语义 CSS 变量与既有间距/字号尺度。
- Do 在深色主题内验证文本、边框、焦点和 hover 的可读性。
- Don't 新建浅色主题、theme wrapper，或写入浅色专属值。
- Don't 硬编码颜色、间距、字号、圆角、阴影或动效时长；z-index 只能引用 `--z-header` / `--z-overlay`。
- Don't 创建 feature-local 基础控件或绕开共享浮层原语。
- Don't 把搜索、导航或内容数据逻辑混入纯视觉归一化。
- Do 将 onboarding 限制在 `/` 单栏营销式布局，不把文档三栏壳套到首页。
- Don't 在 onboarding 增加第二个强调色 CTA 或文档侧栏/TOC。
