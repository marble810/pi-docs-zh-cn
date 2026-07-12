> pi 可以创建 TUI 组件。让它为你的使用场景构建一个。

# TUI 组件

扩展和自定义工具可以渲染自定义的 TUI 组件，用于交互式用户界面。本页涵盖组件系统和可用的构建块。

**来源：** [`@earendil-works/pi-tui`](https://github.com/earendil-works/pi-mono/tree/main/packages/tui)

## 组件接口

所有组件实现：

```typescript
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  wantsKeyRelease?: boolean;
  invalidate(): void;
}
```

| 方法                 | 说明                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `render(width)`      | 返回字符串数组 (每行一个)。每行 **不得超过 `width`**。            |
| `handleInput?(data)` | 当组件获得焦点时接收键盘输入。                                    |
| `wantsKeyRelease?`   | 如果为 true ，组件接收按键释放事件 (Kitty 协议)。默认值： false。 |
| `invalidate()`       | 清除缓存的渲染状态。在主题更改时调用。                            |

TUI 在每一渲染行末尾追加完整的 SGR 重置和 OSC 8 重置。样式不会跨行延续。如果输出带有样式的 multi-line 文本，请按行重新应用样式，或使用 `wrapTextWithAnsi()` 以便为每个换行保留样式。

## 可聚焦接口 (IME 支持)

显示文本光标且需要 IME (输入法编辑器) 支持的组件应实现 `Focusable` 接口：

```typescript
import { CURSOR_MARKER, type Component, type Focusable } from "@earendil-works/pi-tui";

class MyInput implements Component, Focusable {
  focused: boolean = false; // Set by TUI when focus changes

  render(width: number): string[] {
    const marker = this.focused ? CURSOR_MARKER : "";
    // Emit marker right before the fake cursor
    return [`> ${beforeCursor}${marker}\x1b[7m${atCursor}\x1b[27m${afterCursor}`];
  }
}
```

当 `Focusable` 组件获得焦点时，TUI：

1. 在组件上设置 `focused = true`
2. 扫描渲染输出中的 `CURSOR_MARKER` (一个 zero-width APC 转义序列)
3. 将硬件终端光标定位到该位置
4. 仅当 `showHardwareCursor` 启用时才显示硬件光标

默认情况下，光标保持隐藏。这样可以在保持硬件光标定位的同时，渲染伪光标，适用于那些通过隐藏光标来跟踪 IME 候选窗口的终端。某些终端需要可见的硬件光标来进行 IME 定位；可通过 `showHardwareCursor`、`setShowHardwareCursor(true)` 或 `PI_HARDWARE_CURSOR=1` 启用。`Editor` 和 `Input` built-in 组件已实现此接口。

### 包含嵌入输入的容器组件

当容器组件 (对话框、选择器等) 包含 `Input` 或 `Editor` 子组件时，容器必须实现 `Focusable` 并将焦点状态传播给子组件。否则，硬件光标将无法正确定位以进行 IME 输入。

```typescript
import { Container, type Focusable, Input } from "@earendil-works/pi-tui";

class SearchDialog extends Container implements Focusable {
  private searchInput: Input;

  // Focusable implementation - propagate to child input for IME cursor positioning
  private _focused = false;
  get focused(): boolean {
    return this._focused;
  }
  set focused(value: boolean) {
    this._focused = value;
    this.searchInput.focused = value;
  }

  constructor() {
    super();
    this.searchInput = new Input();
    this.addChild(this.searchInput);
  }
}
```

没有这种传播，使用 IME (中文、日语、韩语等) 进行输入时，候选窗口会显示在屏幕上的错误位置。

## 使用组件

**在扩展中** 通过 `ctx.ui.custom()`：

```typescript
pi.on("session_start", async (_event, ctx) => {
  const handle = ctx.ui.custom(myComponent);
  // handle.requestRender() - trigger re-render
  // handle.close() - restore normal UI
});
```

**在自定义工具中** 通过 `pi.ui.custom()`：

```typescript
async execute(toolCallId, params, onUpdate, ctx, signal) {
  const handle = pi.ui.custom(myComponent);
  // ...
  handle.close();
}
```

## 覆盖层

覆盖层在不清屏的情况下在现有内容之上渲染组件。将 `{ overlay: true }` 传递给 `ctx.ui.custom()`：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyDialog({ onClose: done }),
  { overlay: true }
);
```

对于定位和大小调整，使用 `overlayOptions`：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new SidePanel({ onClose: done }),
  {
    overlay: true,
    overlayOptions: {
      // Size: number or percentage string
      width: "50%", // 50% of terminal width
      minWidth: 40, // minimum 40 columns
      maxHeight: "80%", // max 80% of terminal height

      // Position: anchor-based (default: "center")
      anchor: "right-center", // 9 positions: center, top-left, top-center, etc.
      offsetX: -2, // offset from anchor
      offsetY: 0,

      // Or percentage/absolute positioning
      row: "25%", // 25% from top
      col: 10, // column 10

      // Margins
      margin: 2, // all sides, or { top, right, bottom, left }

      // Responsive: hide on narrow terminals
      visible: (termWidth, termHeight) => termWidth >= 80
    },
    // Get handle for programmatic focus and visibility control
    onHandle: (handle) => {
      // handle.focus() - focus this overlay and bring it to the visual front
      // handle.unfocus() - release input to normal fallback
      // handle.unfocus({ target }) - release input to a specific component or null
      // handle.setHidden(true/false) - toggle visibility
      // handle.hide() - permanently remove
    }
  }
);
```

### 覆盖层焦点

一个获得焦点的可见覆盖层会跨临时 non-overlay UI 保持输入所有权。如果覆盖层打开了另一个没有 `{ overlay: true }` 的 `ctx.ui.custom()` 组件，那个替代 UI 在其活动时接收输入；当它关闭时，获得焦点的覆盖层可以重新获取输入。

当一个可见覆盖层应停止拥有输入并让 TUI 回退到另一个可见的捕获覆盖层或之前的焦点目标时，使用 `handle.unfocus()`。当在覆盖层保持可见时，一个特定组件应接收输入时，使用 `handle.unfocus({ target })`。传递 `{ target: null }` 会故意不留下任何已聚焦组件，直到再次设置焦点。

### 覆盖层生命周期

覆盖层组件在关闭时被释放。不要重用引用——创建新的实例：

```typescript
// Wrong - stale reference
let menu: MenuComponent;
await ctx.ui.custom(
  (_, __, ___, done) => {
    menu = new MenuComponent(done);
    return menu;
  },
  { overlay: true }
);
setActiveComponent(menu); // Disposed

// Correct - re-call to re-show
const showMenu = () =>
  ctx.ui.custom((_, __, ___, done) => new MenuComponent(done), { overlay: true });

await showMenu(); // First show
await showMenu(); // "Back" = just call again
```

请参阅 [overlay-qa-tests.ts](../examples/extensions/overlay-qa-tests.ts)，以获取涵盖锚点、边距、堆叠、响应式可见性和动画的全面示例。

## 内置组件

从 `@earendil-works/pi-tui` 导入：

```typescript
import { Text, Box, Container, Spacer, Markdown } from "@earendil-works/pi-tui";
```

### 文本

支持自动换行的多行文本。

```typescript
const text = new Text(
  "Hello World", // content
  1, // paddingX (default: 1)
  1, // paddingY (default: 1)
  (s) => bgGray(s) // optional background function
);
text.setText("Updated");
```

### 盒子

带有内边距和背景颜色的容器。

```typescript
const box = new Box(
  1, // paddingX
  1, // paddingY
  (s) => bgGray(s) // background function
);
box.addChild(new Text("Content", 0, 0));
box.setBgFn((s) => bgBlue(s));
```

### 容器

将子组件垂直分组。

```typescript
const container = new Container();
container.addChild(component1);
container.addChild(component2);
container.removeChild(component1);
```

### 间隔

空的垂直空间。

```typescript
const spacer = new Spacer(2); // 2 empty lines
```

### Markdown

渲染带有语法高亮的 Markdown。

```typescript
const md = new Markdown(
  "# Title\n\nSome **bold** text",
  1, // paddingX
  1, // paddingY
  theme // MarkdownTheme (see below)
);
md.setText("Updated markdown");
```

### 图像

在支持的终端中渲染图像：(Kitty、iTerm2、Ghostty、WezTerm、Warp)。

```typescript
const image = new Image(
  base64Data, // base64-encoded image
  "image/png", // MIME type
  theme, // ImageTheme
  { maxWidthCells: 80, maxHeightCells: 24 }
);
```

## 键盘输入

使用 `matchesKey()` 进行按键检测：

```typescript
import { matchesKey, Key } from "@earendil-works/pi-tui";

handleInput(data: string) {
  if (matchesKey(data, Key.up)) {
    this.selectedIndex--;
  } else if (matchesKey(data, Key.enter)) {
    this.onSelect?.(this.selectedIndex);
  } else if (matchesKey(data, Key.escape)) {
    this.onCancel?.();
  } else if (matchesKey(data, Key.ctrl("c"))) {
    // Ctrl+C
  }
}
```

**关键标识符** (使用 `Key.*` 进行自动补全，或使用字符串字面量)：

- 基本键：`Key.enter`、`Key.escape`、`Key.tab`、`Key.space`、`Key.backspace`、`Key.delete`、`Key.home`、`Key.end`
- 方向键：`Key.up`、`Key.down`、`Key.left`、`Key.right`
- 带修饰键：`Key.ctrl("c")`、`Key.shift("tab")`、`Key.alt("left")`、`Key.ctrlShift("p")`
- 字符串格式同样适用：`"enter"`、`"ctrl+c"`、`"shift+tab"`、`"ctrl+shift+p"`

## 行宽

**关键：** 来自 `render()` 的每一行不得超过 `width` 参数。

```typescript
import { visibleWidth, truncateToWidth } from "@earendil-works/pi-tui";

render(width: number): string[] {
  // Truncate long lines
  return [truncateToWidth(this.text, width)];
}
```

实用工具：

- `visibleWidth(str)` - 获取显示宽度 (忽略 ANSI 代码)
- `truncateToWidth(str, width, ellipsis?)` - 截断并在必要时添加省略号
- `wrapTextWithAnsi(str, width)` - 保留 ANSI 代码的自动换行

## 创建自定义组件

示例：交互式选择器

```typescript
import { matchesKey, Key, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

class MySelector {
  private items: string[];
  private selected = 0;
  private cachedWidth?: number;
  private cachedLines?: string[];

  public onSelect?: (item: string) => void;
  public onCancel?: () => void;

  constructor(items: string[]) {
    this.items = items;
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.up) && this.selected > 0) {
      this.selected--;
      this.invalidate();
    } else if (matchesKey(data, Key.down) && this.selected < this.items.length - 1) {
      this.selected++;
      this.invalidate();
    } else if (matchesKey(data, Key.enter)) {
      this.onSelect?.(this.items[this.selected]);
    } else if (matchesKey(data, Key.escape)) {
      this.onCancel?.();
    }
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    this.cachedLines = this.items.map((item, i) => {
      const prefix = i === this.selected ? "> " : "  ";
      return truncateToWidth(prefix + item, width);
    });
    this.cachedWidth = width;
    return this.cachedLines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
```

在扩展中的使用：

```typescript
pi.registerCommand("pick", {
  description: "Pick an item",
  handler: async (args, ctx) => {
    const items = ["Option A", "Option B", "Option C"];
    const selector = new MySelector(items);

    let handle: { close: () => void; requestRender: () => void };

    await new Promise<void>((resolve) => {
      selector.onSelect = (item) => {
        ctx.ui.notify(`Selected: ${item}`, "info");
        handle.close();
        resolve();
      };
      selector.onCancel = () => {
        handle.close();
        resolve();
      };
      handle = ctx.ui.custom(selector);
    });
  }
});
```

## 主题

组件接受主题对象以实现样式化。

**在 `renderCall`/`renderResult`** 中，使用 `theme` 参数：

```typescript
renderResult(result, options, theme, context) {
  // Use theme.fg() for foreground colors
  return new Text(theme.fg("success", "Done!"), 0, 0);

  // Use theme.bg() for background colors
  const styled = theme.bg("toolPendingBg", theme.fg("accent", "text"));
}
```

**前景色** (`theme.fg(color, text)`)：

| 类别     | 颜色                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通用     | `text`、`accent`、`muted`、`dim`                                                                                                                          |
| 状态     | `success`、`error`、`warning`                                                                                                                             |
| 边框     | `border`, `borderAccent`, `borderMuted`                                                                                                                   |
| 消息     | `userMessageText`, `customMessageText`, `customMessageLabel`                                                                                              |
| 工具     | `toolTitle`, `toolOutput`                                                                                                                                 |
| 差异     | `toolDiffAdded`, `toolDiffRemoved`, `toolDiffContext`                                                                                                     |
| Markdown | `mdHeading`, `mdLink`, `mdLinkUrl`, `mdCode`, `mdCodeBlock`, `mdCodeBlockBorder`, `mdQuote`, `mdQuoteBorder`, `mdHr`, `mdListBullet`                      |
| 语法     | `syntaxComment`, `syntaxKeyword`, `syntaxFunction`, `syntaxVariable`, `syntaxString`, `syntaxNumber`, `syntaxType`, `syntaxOperator`, `syntaxPunctuation` |
| 思考     | `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `thinkingMax`                                         |
| 模式     | `bashMode`                                                                                                                                                |

**背景颜色** (`theme.bg(color, text)`):

`selectedBg`, `userMessageBg`, `customMessageBg`, `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`

**对于 Markdown**，使用 `getMarkdownTheme()`:

```typescript
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";

renderResult(result, options, theme, context) {
  const mdTheme = getMarkdownTheme();
  return new Markdown(result.details.markdown, 0, 0, mdTheme);
}
```

**对于自定义组件**，定义你自己的主题接口：

```typescript
interface MyTheme {
  selected: (s: string) => string;
  normal: (s: string) => string;
}
```

## 调试日志

设置 `PI_TUI_WRITE_LOG` 以捕获写入标准输出的原始 ANSI 流。

```bash
PI_TUI_WRITE_LOG=/tmp/tui-ansi.log npx tsx packages/tui/test/chat-simple.ts
```

## 性能

尽可能缓存渲染输出：

```typescript
class CachedComponent {
  private cachedWidth?: number;
  private cachedLines?: string[];

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }
    // ... compute lines ...
    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
```

当状态变化时调用`invalidate()`，然后调用`handle.requestRender()`以触发re-render。

## 失效与主题更改

当主题更改时，TUI在所有组件上调用`invalidate()`以清除其缓存。组件必须正确实现`invalidate()`以确保主题更改生效。

### 问题

如果组件pre-bakes主题颜色为字符串(通过`theme.fg()`、`theme.bg()`等方式)并缓存它们，则缓存的字符串包含来自旧主题的ANSI转义码。如果组件单独存储了带有主题的内容，仅清除渲染缓存是不够的。

**错误方法** (主题颜色不会更新)：

```typescript
class BadComponent extends Container {
  private content: Text;

  constructor(message: string, theme: Theme) {
    super();
    // Pre-baked theme colors stored in Text component
    this.content = new Text(theme.fg("accent", message), 1, 0);
    this.addChild(this.content);
  }
  // No invalidate override - parent's invalidate only clears
  // child render caches, not the pre-baked content
}
```

### 解决方案

当调用`invalidate()`时，使用主题颜色构建内容的组件必须重新构建该内容：

```typescript
class GoodComponent extends Container {
  private message: string;
  private content: Text;

  constructor(message: string) {
    super();
    this.message = message;
    this.content = new Text("", 1, 0);
    this.addChild(this.content);
    this.updateDisplay();
  }

  private updateDisplay(): void {
    // Rebuild content with current theme
    this.content.setText(theme.fg("accent", this.message));
  }

  override invalidate(): void {
    super.invalidate(); // Clear child caches
    this.updateDisplay(); // Rebuild with new theme
  }
}
```

### 模式：失效时重建

对于具有复杂内容的组件：

```typescript
class ComplexComponent extends Container {
  private data: SomeData;

  constructor(data: SomeData) {
    super();
    this.data = data;
    this.rebuild();
  }

  private rebuild(): void {
    this.clear(); // Remove all children

    // Build UI with current theme
    this.addChild(new Text(theme.fg("accent", theme.bold("Title")), 1, 0));
    this.addChild(new Spacer(1));

    for (const item of this.data.items) {
      const color = item.active ? "success" : "muted";
      this.addChild(new Text(theme.fg(color, item.label), 1, 0));
    }
  }

  override invalidate(): void {
    super.invalidate();
    this.rebuild();
  }
}
```

### 何时需要考虑

在以下情况下需要此模式：

1. **预烘焙主题颜色** - 使用`theme.fg()`或`theme.bg()`创建存储在子组件中的样式字符串
2. **语法高亮** - 使用`highlightCode()`应用theme-based语法颜色
3. **复杂布局** - 构建嵌入主题颜色的子组件树

此模式在以下情况下NOT需要：

1. **使用主题回调** - 传递像`(text) => theme.fg("accent", text)`这样在渲染期间被调用的函数
2. **简单容器** - 仅分组其他组件，不添加主题内容
3. **无状态渲染** - 在每次`render()`调用时重新计算主题输出(无缓存)

## 常用模式

这些模式涵盖了扩展中最常见的 UI 需求。**请复制这些模式，而不是从头构建。**

### 模式 1 ：选择对话框 (SelectList)

用于让用户从选项列表中选择。使用来自`@earendil-works/pi-tui`的`SelectList`，并用`DynamicBorder`进行框架搭建。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";

pi.registerCommand("pick", {
  handler: async (_args, ctx) => {
    const items: SelectItem[] = [
      { value: "opt1", label: "Option 1", description: "First option" },
      { value: "opt2", label: "Option 2", description: "Second option" },
      { value: "opt3", label: "Option 3" } // description is optional
    ];

    const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const container = new Container();

      // Top border
      container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

      // Title
      container.addChild(new Text(theme.fg("accent", theme.bold("Pick an Option")), 1, 0));

      // SelectList with theme
      const selectList = new SelectList(items, Math.min(items.length, 10), {
        selectedPrefix: (t) => theme.fg("accent", t),
        selectedText: (t) => theme.fg("accent", t),
        description: (t) => theme.fg("muted", t),
        scrollInfo: (t) => theme.fg("dim", t),
        noMatch: (t) => theme.fg("warning", t)
      });
      selectList.onSelect = (item) => done(item.value);
      selectList.onCancel = () => done(null);
      container.addChild(selectList);

      // Help text
      container.addChild(
        new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0)
      );

      // Bottom border
      container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

      return {
        render: (w) => container.render(w),
        invalidate: () => container.invalidate(),
        handleInput: (data) => {
          selectList.handleInput(data);
          tui.requestRender();
        }
      };
    });

    if (result) {
      ctx.ui.notify(`Selected: ${result}`, "info");
    }
  }
});
```

**示例：** [preset.ts](../examples/extensions/preset.ts), [tools.ts](../examples/extensions/tools.ts)

### 模式 2 ：带取消的异步操作 (BorderedLoader)

用于需要耗时且应可取消的操作。`BorderedLoader` 显示旋转动画并处理 Escape 键以取消。

```typescript
import { BorderedLoader } from "@earendil-works/pi-coding-agent";

pi.registerCommand("fetch", {
  handler: async (_args, ctx) => {
    const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const loader = new BorderedLoader(tui, theme, "Fetching data...");
      loader.onAbort = () => done(null);

      // Do async work
      fetchData(loader.signal)
        .then((data) => done(data))
        .catch(() => done(null));

      return loader;
    });

    if (result === null) {
      ctx.ui.notify("Cancelled", "info");
    } else {
      ctx.ui.setEditorText(result);
    }
  }
});
```

**示例：** [qna.ts](../examples/extensions/qna.ts), [handoff.ts](../examples/extensions/handoff.ts)

### 模式 3 ：设置/切换开关 (SettingsList)

用于切换多个设置。使用来自 `@earendil-works/pi-tui` 的 `SettingsList` 搭配 `getSettingsListTheme()`。

```typescript
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, type SettingItem, SettingsList, Text } from "@earendil-works/pi-tui";

pi.registerCommand("settings", {
  handler: async (_args, ctx) => {
    const items: SettingItem[] = [
      { id: "verbose", label: "Verbose mode", currentValue: "off", values: ["on", "off"] },
      { id: "color", label: "Color output", currentValue: "on", values: ["on", "off"] }
    ];

    await ctx.ui.custom((_tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new Text(theme.fg("accent", theme.bold("Settings")), 1, 1));

      const settingsList = new SettingsList(
        items,
        Math.min(items.length + 2, 15),
        getSettingsListTheme(),
        (id, newValue) => {
          // Handle value change
          ctx.ui.notify(`${id} = ${newValue}`, "info");
        },
        () => done(undefined), // On close
        { enableSearch: true } // Optional: enable fuzzy search by label
      );
      container.addChild(settingsList);

      return {
        render: (w) => container.render(w),
        invalidate: () => container.invalidate(),
        handleInput: (data) => settingsList.handleInput?.(data)
      };
    });
  }
});
```

**示例：** [tools.ts](../examples/extensions/tools.ts)

### 模式 4 ：持久状态指示器

在页脚显示跨渲染持久的状态。适用于模式指示器。

```typescript
// Set status (shown in footer)
ctx.ui.setStatus("my-ext", ctx.ui.theme.fg("accent", "● active"));

// Clear status
ctx.ui.setStatus("my-ext", undefined);
```

**示例：** [status-line.ts](../examples/extensions/status-line.ts), [plan-mode/index.ts](../examples/extensions/plan-mode/index.ts), [preset.ts](../examples/extensions/preset.ts)

### 模式 4b ：工作指示器自定义

自定义 Pi 流式传输响应时显示的内联工作指示器。

```typescript
// Static indicator
ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg("accent", "●")] });

// Custom animated indicator
ctx.ui.setWorkingIndicator({
  frames: [
    ctx.ui.theme.fg("dim", "·"),
    ctx.ui.theme.fg("muted", "•"),
    ctx.ui.theme.fg("accent", "●"),
    ctx.ui.theme.fg("muted", "•")
  ],
  intervalMs: 120
});

// Hide the indicator entirely
ctx.ui.setWorkingIndicator({ frames: [] });

// Restore pi's default spinner
ctx.ui.setWorkingIndicator();
```

这仅影响普通的流式工作指示器。上下文压缩和重试加载器保持其 built-in 样式。自定义帧按原样渲染，因此扩展程序在需要时必须自行添加颜色。

**示例：** [working-indicator.ts](../examples/extensions/working-indicator.ts)

### 模式 5 ：编辑器上方/下方的小部件

在输入编辑器上方或下方显示持久内容。适用于待办事项列表、进度。

```typescript
// Simple string array (above editor by default)
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"]);

// Render below the editor
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"], { placement: "belowEditor" });

// Or with theme
ctx.ui.setWidget("my-widget", (_tui, theme) => {
  const lines = items.map((item, i) =>
    item.done
      ? theme.fg("success", "✓ ") + theme.fg("muted", item.text)
      : theme.fg("dim", "○ ") + item.text
  );
  return {
    render: () => lines,
    invalidate: () => {}
  };
});

// Clear
ctx.ui.setWidget("my-widget", undefined);
```

**示例：** [plan-mode/index.ts](../examples/extensions/plan-mode/index.ts)

### 模式 6 ：自定义页脚

替换页脚。`footerData` 暴露了扩展程序无法直接访问的数据。

```typescript
ctx.ui.setFooter((tui, theme, footerData) => ({
  invalidate() {},
  render(width: number): string[] {
    // footerData.getGitBranch(): string | null
    // footerData.getExtensionStatuses(): ReadonlyMap<string, string>
    return [`${ctx.model?.id} (${footerData.getGitBranch() || "no git"})`];
  },
  dispose: footerData.onBranchChange(() => tui.requestRender()) // reactive
}));

ctx.ui.setFooter(undefined); // restore default
```

可通过 `ctx.sessionManager.getBranch()` 和 `ctx.model` 获取 token 统计信息。

**示例：** [custom-footer.ts](../examples/extensions/custom-footer.ts)

### 模式 7 ：自定义编辑器 (vim 模式等)

将主输入编辑器替换为自定义实现。适用于模态编辑 (vim)、不同的键绑定 (emacs) 或专门的输入处理。

```typescript
import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

type Mode = "normal" | "insert";

class VimEditor extends CustomEditor {
  private mode: Mode = "insert";

  handleInput(data: string): void {
    // Escape: switch to normal mode, or pass through for app handling
    if (matchesKey(data, "escape")) {
      if (this.mode === "insert") {
        this.mode = "normal";
        return;
      }
      // In normal mode, escape aborts agent (handled by CustomEditor)
      super.handleInput(data);
      return;
    }

    // Insert mode: pass everything to CustomEditor
    if (this.mode === "insert") {
      super.handleInput(data);
      return;
    }

    // Normal mode: vim-style navigation
    switch (data) {
      case "i":
        this.mode = "insert";
        return;
      case "h":
        super.handleInput("\x1b[D");
        return; // Left
      case "j":
        super.handleInput("\x1b[B");
        return; // Down
      case "k":
        super.handleInput("\x1b[A");
        return; // Up
      case "l":
        super.handleInput("\x1b[C");
        return; // Right
    }
    // Pass unhandled keys to super (ctrl+c, etc.), but filter printable chars
    if (data.length === 1 && data.charCodeAt(0) >= 32) return;
    super.handleInput(data);
  }

  render(width: number): string[] {
    const lines = super.render(width);
    // Add mode indicator to bottom border (use truncateToWidth for ANSI-safe truncation)
    if (lines.length > 0) {
      const label = this.mode === "normal" ? " NORMAL " : " INSERT ";
      const lastLine = lines[lines.length - 1]!;
      // Pass "" as ellipsis to avoid adding "..." when truncating
      lines[lines.length - 1] = truncateToWidth(lastLine, width - label.length, "") + label;
    }
    return lines;
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    // Factory receives theme and keybindings from the app
    ctx.ui.setEditorComponent((tui, theme, keybindings) => new VimEditor(theme, keybindings));
  });
}
```

**要点：**

- **扩展 `CustomEditor`** (而不是基类 `Editor`) 以获得应用键绑定 (Escape 取消、Ctrl+D 退出、模型切换等)
- **对于你不处理的键，调用 `super.handleInput(data)`**
- **工厂模式**: `setEditorComponent` 接收一个工厂函数，该函数获得 `tui`、`theme` 和 `keybindings`
- **传递 `undefined`** 以恢复默认编辑器： `ctx.ui.setEditorComponent(undefined)`

**示例：** [modal-editor.ts](../examples/extensions/modal-editor.ts)

## 关键规则

1. **始终从回调中使用主题** - 不要直接导入主题。使用来自 `ctx.ui.custom((tui, theme, keybindings, done) => ...)` 回调的 `theme`。

2. **始终为 DynamicBorder 颜色参数指定类型** - 写 `(s: string) => theme.fg("accent", s)`，而不是 `(s) => theme.fg("accent", s)`。

3. **在状态更改后调用 tui.requestRender()** - 在 `handleInput` 中，更新状态后调用 `tui.requestRender()`。

4. **返回 three-method 对象** - 自定义组件需要 `{ render, invalidate, handleInput }`。

5. **使用现有组件** - `SelectList`、`SettingsList`、`BorderedLoader` 覆盖了 90% 的情况。不要重新构建它们。

## 示例

- **选择 UI**: [examples/extensions/preset.ts](../examples/extensions/preset.ts) - SelectList 与 DynamicBorder 框架
- **带取消的异步**: [examples/extensions/qna.ts](../examples/extensions/qna.ts) - BorderedLoader 用于 LLM 调用
- **设置开关**: [examples/extensions/tools.ts](../examples/extensions/tools.ts) - SettingsList 用于启用/禁用工具
- **状态指示器**: [examples/extensions/plan-mode/index.ts](../examples/extensions/plan-mode/index.ts) - setStatus 和 setWidget
- **工作指示器**: [examples/extensions/working-indicator.ts](../examples/extensions/working-indicator.ts) - setWorkingIndicator
- **自定义页脚**: [examples/extensions/custom-footer.ts](../examples/extensions/custom-footer.ts) - 带统计信息的 setFooter
- **自定义编辑器**: [examples/extensions/modal-editor.ts](../examples/extensions/modal-editor.ts) - 类 Vim 模式编辑
- **贪吃蛇游戏**: [examples/extensions/snake.ts](../examples/extensions/snake.ts) - 包含键盘输入和游戏循环的完整游戏
- **自定义工具渲染**: [examples/extensions/todo.ts](../examples/extensions/todo.ts) - renderCall 和 renderResult
