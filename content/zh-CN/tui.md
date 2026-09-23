# 终端 UI ｜终端 UI

`@earendil-works/pi-tui` 提供 Pi 使用的终端组件系统。当 built-in 对话框、通知、状态文本和小组件不足以满足扩展所需的交互时，扩展会使用它。

从 [扩展](extensions.md#interact-with-the-user) 中的 `ctx.ui` 方法开始。仅当 UI 需要自己的渲染、键盘或鼠标输入、焦点、布局或生命周期时，才构建自定义组件。

## 选择集成点｜ Choose an integration point

| 需求 | 使用 |
|---|---|
| 选择、确认、输入或 multi-line 编辑器 | `ctx.ui.select()`、`confirm()`、`input()` 或 `editor()` |
| 非阻塞反馈 | `ctx.ui.notify()` 或 `setStatus()` |
| 编辑器附近的持久内容 | `ctx.ui.setWidget()` |
| 替换页眉、页脚或编辑器 | 对应的 `ctx.ui` 组件工厂 |
| 临时交互式屏幕或覆盖层 | `ctx.ui.custom()` |
| 为工具或会话条目自定义渲染 | 扩展渲染器 |

这些 API 会在需要时接收 Pi 的活动主题和键位绑定。不要在扩展内创建第二个终端渲染器。

## 理解组件模型

组件会在给定可用宽度下渲染一组终端行。它可以选择性地处理键盘和鼠标输入，并且当其状态或 theme-dependent 内容发生变化时，必须使缓存输出失效。

每一行渲染结果都必须适配所提供的宽度。应测量可见终端列数，而不是字符串长度，因为 ANSI 转义序列、宽字符、emoji 和组合字符会改变显示宽度。

使用 `visibleWidth()`、`truncateToWidth()`、`sliceByColumn()` 和 `wrapTextWithAnsi()`，而不是自行实现 terminal-width 处理。Pi 会在每一行之后重置样式和超链接，因此需要在每一行渲染时重新应用样式。

更改组件状态后，使受影响的组件失效，并调用注入的 `tui.requestRender()`。TUI 会合并渲染请求并更新终端。

## 组合 built-in 组件

该包包含用于常见布局和控件的组件：

- `Text`、`Markdown`、`Image` 和 `TruncatedText` 用于渲染内容。
- `Container`、`VStack`、`HStack`、`Box` 和 `Spacer` 用于组合布局。
- `Input` 和 `Editor` 接受文本。
- `SelectList` 和 `SettingsList` 实现可搜索的选择和设置流程。
- `ScrollView` 提供有边界的可滚动视口。
- `Loader` 和 `CancellableLoader` 报告正在进行的工作。
- `MouseRegion` 在另一个组件周围添加指针行为。

优先使用这些组件，而不是重新构建选择、滚动、文本编辑或宽度处理。扩展示例展示了如何将它们与 Pi 的边框和主题组合使用。

## 处理键盘输入和焦点

使用 `matchesKey()` 和 `Key` 处理终端键盘输入。解析器会考虑受支持的终端协议和按键修饰符。扩展组件应使用注入的 `KeybindingsManager` 来执行可配置的应用程序操作。

显示文本光标的组件应实现 `Focusable`，并将 `CURSOR_MARKER` 紧邻其可视光标之前放置。TUI 使用该标记为输入法编辑器定位硬件光标。

包装 `Input` 或 `Editor` 的容器必须将其 `focused` 状态传播到该子级。如果不传播，中文、日文、韩文及其他 IME 候选窗口可能会出现在错误的屏幕位置。

替换主编辑器时，扩展 Pi 的 `CustomEditor`。它会保留应用程序快捷键和代理控件。

将你的编辑器不拥有的按键转发给基础实现，并通过清除自定义编辑器工厂来恢复默认设置。

## 处理鼠标输入｜ Handle mouse input

全屏模式会将规范化后的鼠标事件路由到组件。处理程序可以标记事件已处理、捕获拖拽序列、请求焦点或请求渲染。

未处理的滚轮事件会滚动最近的 `ScrollView`。未处理的 primary-button 拖拽仍可用于转录选择。OSC 8 链接优先于包围的点击区域。

常规模式将鼠标输入留给终端，因为终端拥有回滚缓冲区。即使全屏鼠标输入可用，也要为每个交互设计键盘路径。

## 使用自定义屏幕和覆盖层｜ Use custom screens and overlays

`ctx.ui.custom()` 会临时将一个组件的控制权交给交互区域，并在该组件调用提供的完成回调时解析。

传递 `overlay: true` 以在现有内容之上绘制。覆盖层选项控制大小、锚点、偏移、边距和响应式可见性。覆盖层句柄可以在交互保持活动状态时更改焦点，或使用 `setHidden()` 临时隐藏和显示覆盖层。

获得焦点的覆盖层在普通渲染期间保留输入所有权。如果另一个组件应在覆盖层保持可见时接收输入，请通过句柄显式释放或重定向焦点。

将每个自定义组件实例视为属于一次交互。再次开始该交互时创建新实例。

使用提供给组件工厂的完成回调结束交互。它会解析 `ctx.ui.custom()` promise 并释放组件。不要对由 `ctx.ui.custom()` 创建的覆盖层调用 `OverlayHandle.hide()`。

有关定位、堆叠、焦点、响应式可见性和动画行为，请参阅 [`overlay-qa-tests.ts`](../examples/extensions/overlay-qa-tests.ts)。

## 正确应用主题｜ Apply themes correctly

使用传递给扩展或组件回调的主题。主题辅助函数会为语义颜色（如强调色、弱化文本、成功、警告、错误、工具输出和 Markdown）生成 ANSI 样式的字符串。

除非 `invalidate()` 重建它们，否则不要永久存储带有主题颜色的字符串。主题更改会清除渲染缓存，但无法移除嵌入应用程序状态中的旧 ANSI 颜色。

在渲染期间评估的主题回调不需要特殊重建。无状态组件也可以在每次渲染时计算主题化输出。

使用 [Themes](themes.md) 创建终端调色板。在渲染应与活动应用程序主题匹配的 Markdown 时，使用 Pi 的 `getMarkdownTheme()`。

## 保持渲染响应｜ Keep rendering responsive

渲染在交互路径上运行。按宽度和内容缓存开销大的布局和高亮工作，然后从 `invalidate()` 清除该缓存。

保持默认视图紧凑，并通过展开或专用屏幕显示详细信息。对于自定义工具渲染，处理部分结果，并在可以安全更新时重用先前的组件。

在诊断渲染问题时，使用 `PI_TUI_WRITE_LOG` 捕获原始 ANSI 流。测试窄宽度、宽字符、调整大小事件、主题更改、焦点转换以及常规和全屏模式。

## 示例和源代码｜ Examples and source

已检查的扩展示例涵盖了主要模式：

- [`preset.ts`](../examples/extensions/preset.ts) 和 [`tools.ts`](../examples/extensions/tools.ts) 使用选择列表和设置列表。
- [`qna.ts`](../examples/extensions/qna.ts) 使用可取消的异步 UI。
- [`modal-editor.ts`](../examples/extensions/modal-editor.ts) 替换编辑器。
- [`custom-footer.ts`](../examples/extensions/custom-footer.ts) 替换页脚。
- [`widget-placement.ts`](../examples/extensions/widget-placement.ts) 在编辑器周围放置持久内容。
- [`doom-overlay/`](../examples/extensions/doom-overlay/) 演示持续渲染的覆盖层。

公开导出定义在 [`packages/tui/src/index.ts`](https://github.com/earendil-works/pi/blob/main/packages/tui/src/index.ts) 中。有关扩展生命周期、状态、工具、事件和模式行为，请参阅 [Extensions](extensions.md)。
