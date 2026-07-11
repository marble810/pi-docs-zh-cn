> pi 可以创建 TUI 组件。让它为你的用例构建一个。

# TUI 组件

扩展和自定义工具可以为交互式用户界面渲染自定义 TUI 组件。本页介绍组件系统及可用的构建块。

**Source:** [`@earendil-works/pi-tui`](https://github.com/earendil-works/pi-mono/tree/main/packages/tui)

## 组件接口

所有组件都实现：

```typescript
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  wantsKeyRelease?: boolean;
  invalidate(): void;
}
```

| 方法                 | 描述                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| `render(width)`      | Return array of strings (one per line). Each line **must not exceed `width`**. |
| `handleInput?(data)` | 当组件获得焦点时接收键盘输入。                                                 |
| `wantsKeyRelease?`   | 若为 true ，组件将接收按键释放事件（ Kitty 协议）。默认值： false。            |
| `invalidate()`       | 清除缓存的渲染状态。在主题更改时调用。                                         |

The TUI appends a full SGR reset and OSC 8 reset at the end of each rendered line. Styles do not carry across lines. If you emit multi-line text with styling, reapply styles per line or use `wrapWithAnsi()` so styles are preserved for each wrapped line.

## Focusable 接口（ IME 支持）

Components that display a text cursor and need IME (Input Method Editor) support should implement the `Focusable` interface:

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

When a `Focusable` component has focus, TUI:

1. Sets `focused = true` on the component
2. Scans rendered output for `CURSOR_MARKER` (a zero-width APC escape sequence)
3. 将硬件终端光标定位到该位置
4. Shows the hardware cursor only when `showHardwareCursor` is enabled

The cursor remains hidden by default. This keeps the fake cursor rendering, while still positioning the hardware cursor for terminals that track IME candidate windows with hidden cursors. Some terminals require a visible hardware cursor for IME positioning; enable it with `showHardwareCursor`, `setShowHardwareCursor(true)`, or `PI_HARDWARE_CURSOR=1`. The `Editor` and `Input` built-in components already implement this interface.

### 器组件

When a container component (dialog, selector, etc.) contains an `Input` or `Editor` child, the container must implement `Focusable` and propagate the focus state to the child. Otherwise, the hardware cursor won't be positioned correctly for IME input.

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

如果没有此传播，使用 IME （中文、日文、韩文等）输入时，候选窗口将显示在屏幕上的错误位置。

## 使用组件

**In extensions** via `ctx.ui.custom()`:

```typescript
pi.on("session_start", async (_event, ctx) => {
  const handle = ctx.ui.custom(myComponent);
  // handle.requestRender() - trigger re-render
  // handle.close() - restore normal UI
});
```

**In custom tools** via `pi.ui.custom()`:

```typescript
async execute(toolCallId, params, onUpdate, ctx, signal) {
  const handle = pi.ui.custom(myComponent);
  // ...
  handle.close();
}
```

## 叠加层

Overlays render components on top of existing content without clearing the screen. Pass `{ overlay: true }` to `ctx.ui.custom()`:

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyDialog({ onClose: done }),
  { overlay: true }
);
```

For positioning and sizing, use `overlayOptions`:

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

###

A focused visible overlay keeps input ownership across temporary non-overlay UI. If an overlay opens another `ctx.ui.custom()` component without `{ overlay: true }`, that replacement UI receives input while it is active; when it closes, the focused overlay can reclaim input.

Use `handle.unfocus()` when a visible overlay should stop owning input and let TUI fall back to another visible capturing overlay or the previous focus target. Use `handle.unfocus({ target })` when a specific component should receive input while the overlay stays visible. Passing `{ target: null }` intentionally leaves no focused component until focus is set again.

###

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

See [overlay-qa-tests.ts](../examples/extensions/overlay-qa-tests.ts) for comprehensive examples covering anchors, margins, stacking, responsive visibility, and animation.

##

Import from `@earendil-works/pi-tui`:

```typescript
import { Text, , Container, , Markdown"@earendil-works/pi-tui";
```

### Text

```typescript
const text = new Text(
  "Hello World", // content
  1, // paddingX (default: 1)
  1, // paddingY (default: 1)
  (s) => bgGray(s) // optional background function
);
text.setText("Updated");
```

### Box

```typescript
const box = new Box(
  1, // paddingX
  1, // paddingY
  (s) => bgGray(s) // background function
);
box.addChild(new Text("Content", 0, 0));
box.setBgFn((s) => bgBlue(s));
```

### Container

```typescript
const container = new Container();
container.addChild(component1);
container.addChild(component2);
container.removeChild(component1);
```

### Spacer

```typescript
const spacer = new Spacer(2); // 2 empty lines
```

### Markdown

```typescript
const md = new Markdown(
  "# Title\n\nSome **bold** text",
  1, // paddingX
  1, // paddingY
  theme // MarkdownTheme (see below)
);
md.setText("Updated markdown");
```

###

```typescript
const image = new Image(
  base64Data, // base64-encoded image
  "image/png", // MIME type
  theme, // ImageTheme
  { maxWidthCells: 80, maxHeightCells: 24 }
);
```

##

Use `matchesKey()` for key detection:

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

**Key identifiers** (use `Key.*` for autocomplete, or string literals):

- Basic keys: `Key.enter`, `Key.escape`, `Key.tab`, `Key.space`, `Key.backspace`, `Key.delete`, `Key.home`, `Key.end`
- Arrow keys: `Key.up`, `Key.down`, `Key.left`, `Key.right`
- With modifiers: `Key.ctrl("c")`, `Key.shift("tab")`, `Key.alt("left")`, `Key.ctrlShift("p")`
- String format also works: `"enter"`, `"ctrl+c"`, `"shift+tab"`, `"ctrl+shift+p"`

##

**Critical:** Each line from `render()` must not exceed the `width` parameter.

```typescript
import { visibleWidth, truncateToWidth } from "@earendil-works/pi-tui";

render(width: number): string[] {
  // Truncate long lines
  return [truncateToWidth(this.text, width)];
}
```

- `visibleWidth(str)` - Get display width (ignores ANSI codes)
- `truncateToWidth(str, width, ellipsis?)` - Truncate with optional ellipsis
- `wrapTextWithAnsi(str, width)` - Word wrap preserving ANSI codes

##

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

##

**In `renderCall`/`renderResult`**, use the `theme` parameter:

```typescript
renderResult(result, options, theme, context) {
  // Use theme.fg() for foreground colors
  return new Text(theme.fg("success", "Done!"), 0, 0);

  // Use theme.bg() for background colors
  const styled = theme.bg("toolPendingBg", theme.fg("accent", "text"));
}
```

**Foreground colors** (`theme.fg(color, text)`):

|          |                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
|          | `text`, `accent`, `muted`, `dim`                                                                                                                          |
|          | `success`, `error`, `warning`                                                                                                                             |
| 边框     | `border`, `borderAccent`, `borderMuted`                                                                                                                   |
| 消息     | `userMessageText`, `customMessageText`, `customMessageLabel`                                                                                              |
| 工具     | `toolTitle`, `toolOutput`                                                                                                                                 |
| 差异     | `toolDiffAdded`, `toolDiffRemoved`, `toolDiffContext`                                                                                                     |
| Markdown | `mdHeading`, `mdLink`, `mdLinkUrl`, `mdCode`, `mdCodeBlock`, `mdCodeBlockBorder`, `mdQuote`, `mdQuoteBorder`, `mdHr`, `mdListBullet`                      |
| 语法     | `syntaxComment`, `syntaxKeyword`, `syntaxFunction`, `syntaxVariable`, `syntaxString`, `syntaxNumber`, `syntaxType`, `syntaxOperator`, `syntaxPunctuation` |
| 思考     | `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `thinkingMax`                                         |
| 模式     | `bashMode`                                                                                                                                                |

**Background colors** (`theme.bg(color, text)`):

`selectedBg`, `userMessageBg`, `customMessageBg`, `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`

**For Markdown**, use `getMarkdownTheme()`:

```typescript
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";

renderResult(result, options, theme, context) {
  const mdTheme = getMarkdownTheme();
  return new Markdown(result.details.markdown, 0, 0, mdTheme);
}
```

**For custom components**, define your own theme interface:

```typescript
interface MyTheme {
  selected: (s: string) => string;
  normal: (s: string) => string;
}
```

## 调试日志

Set `PI_TUI_WRITE_LOG` to capture the raw ANSI stream written to stdout.

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

Call `invalidate()` when state changes, then `handle.requestRender()` to trigger re-render.

## 失效与主题变更

When the theme changes, the TUI calls `invalidate()` on all components to clear their caches. Components must properly implement `invalidate()` to ensure theme changes take effect.

### 问题所在

If a component pre-bakes theme colors into strings (via `theme.fg()`, `theme.bg()`, etc.) and caches them, the cached strings contain ANSI escape codes from the old theme. Simply clearing the render cache isn't enough if the component stores the themed content separately.

**Wrong approach** (theme colors won't update):

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

Components that build content with theme colors must rebuild that content when `invalidate()` is called:

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

对于内容复杂的组件：

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

### 何时需要关注

在以下情况下需要此模式：

1. **Pre-baking theme colors** - Using `theme.fg()` or `theme.bg()` to create styled strings stored in child components
2. **Syntax highlighting** - Using `highlightCode()` which applies theme-based syntax colors
3. **Complex layouts** - Building child component trees that embed theme colors

在以下情况下不需要此模式：

1. **Using theme callbacks** - Passing functions like `(text) => theme.fg("accent", text)` that are called during render
2. **Simple containers** - Just grouping other components without adding themed content
3. **Stateless render** - Computing themed output fresh in every `render()` call (no caching)

## 常见模式

These patterns cover the most common UI needs in extensions. **Copy these patterns instead of building from scratch.**

### 模式 1 ：选择对话框 (SelectList)

For letting users pick from a list of options. Use `SelectList` from `@earendil-works/pi-tui` with `DynamicBorder` for framing.

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

**示例:** [preset.ts](../examples/extensions/preset.ts), [tools.ts](../examples/extensions/tools.ts)

### 模式 2 ：带取消的异步操作 (BorderedLoader)

For operations that take time and should be cancellable. `BorderedLoader` shows a spinner and handles escape to cancel.

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

**Examples:** [qna.ts](../examples/extensions/qna.ts), [handoff.ts](../examples/extensions/handoff.ts)

### 模式 3 ：设置/开关 (SettingsList)

For toggling multiple settings. Use `SettingsList` from `@earendil-works/pi-tui` with `getSettingsListTheme()`.

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

**Examples:** [tools.ts](../examples/extensions/tools.ts)

### 模式 4 ：持久状态指示器

在页脚中显示跨渲染持久存在的状态。适用于模式指示器。

```typescript
// Set status (shown in footer)
ctx.ui.setStatus("my-ext", ctx.ui.theme.fg("accent", "● active"));

// Clear status
ctx.ui.setStatus("my-ext", undefined);
```

**Examples:** [status-line.ts](../examples/extensions/status-line.ts), [plan-mode/index.ts](../examples/extensions/plan-mode/index.ts), [preset.ts](../examples/extensions/preset.ts)

### 模式 4b ：工作指示器自定义

自定义 pi 流式传输响应时显示的内联工作指示器。

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

这仅影响正常的流式传输工作指示器。上下文压缩和重试加载器保留其内置样式。自定义帧按原样渲染，因此扩展程序在需要时必须自行添加颜色。

**Examples:** [working-indicator.ts](../examples/extensions/working-indicator.ts)

### 模式 5 ：编辑器上方/下方的小部件

在输入编辑器上方或下方显示持久内容。适用于待办事项列表、进度显示。

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

**Examples:** [plan-mode/index.ts](../examples/extensions/plan-mode/index.ts)

### 模式 6 ：自定义页脚

Replace the footer. `footerData` exposes data not otherwise accessible to extensions.

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

Token stats available via `ctx.sessionManager.getBranch()` and `ctx.model`.

**Examples:** [custom-footer.ts](../examples/extensions/custom-footer.ts)

### 模式 7 ：自定义编辑器（ vim 模式等）

用自定义实现替换主输入编辑器。适用于模态编辑（ vim ）、不同键绑定（ emacs ）或专门的输入处理。

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

**关键点：**

- **Extend `CustomEditor`** (not base `Editor`) to get app keybindings (escape to abort, ctrl+d to exit, model switching, etc.)
- **Call `super.handleInput(data)`** for keys you don't handle
- **Factory pattern**: `setEditorComponent` receives a factory function that gets `tui`, `theme`, and `keybindings`
- **Pass `undefined`** to restore the default editor: `ctx.ui.setEditorComponent(undefined)`

**Examples:** [modal-editor.ts](../examples/extensions/modal-editor.ts)

## 关键规则

1. **Always use theme from callback** - Don't import theme directly. Use `theme` from the `ctx.ui.custom((tui, theme, keybindings, done) => ...)` callback.

2. **Always type DynamicBorder color param** - Write `(s: string) => theme.fg("accent", s)`, not `(s) => theme.fg("accent", s)`.

3. **Call tui.requestRender() after state changes** - In `handleInput`, call `tui.requestRender()` after updating state.

4. **Return the three-method object** - Custom components need `{ render, invalidate, handleInput }`.

5. **Use existing components** - `SelectList`, `SettingsList`, `BorderedLoader` cover 90% of cases. Don't rebuild them.

## Examples

- **Selection UI**: [examples/extensions/preset.ts](../examples/extensions/preset.ts) - SelectList with DynamicBorder framing
- **Async with cancel**: [examples/extensions/qna.ts](../examples/extensions/qna.ts) - BorderedLoader for LLM calls
- **Settings toggles**: [examples/extensions/tools.ts](../examples/extensions/tools.ts) - SettingsList for tool enable/disable
- **Status indicators**: [examples/extensions/plan-mode/index.ts](../examples/extensions/plan-mode/index.ts) - setStatus and setWidget
- **Working indicator**: [examples/extensions/working-indicator.ts](../examples/extensions/working-indicator.ts) - setWorkingIndicator
- **Custom footer**: [examples/extensions/custom-footer.ts](../examples/extensions/custom-footer.ts) - setFooter with stats
- **Custom editor**: [examples/extensions/modal-editor.ts](../examples/extensions/modal-editor.ts) - Vim-like modal editing
- **Snake game**: [examples/extensions/snake.ts](../examples/extensions/snake.ts) - Full game with keyboard input, game loop
- **Custom tool rendering**: [examples/extensions/todo.ts](../examples/extensions/todo.ts) - renderCall and renderResult
