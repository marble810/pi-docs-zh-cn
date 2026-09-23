# RPC 扩展 UI ｜ 扩展 UI

扩展可以通过 `ctx.ui` 请求用户交互。在 RPC 模式下，受支持的调用会成为一种请求/响应子协议，与普通的 [RPC 命令](rpc-commands.md) 和 [会话事件](json.md) 并列。

扩展 UI 方法分为两类：

- **对话框方法** (`select`、`confirm`、`input`、`editor`)：在 stdout 上发出一个 `extension_ui_request`，并阻塞，直到客户端在 stdin 上发回一个带有匹配 `id` 的 `extension_ui_response`。
- **Fire-and-forget 方法** (`notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text`)：在 stdout 上发出一个 `extension_ui_request`，但不期望响应。客户端可以显示该信息或忽略它。

如果对话框方法包含 `timeout` 字段，则当超时到期时，agent-side 将以默认值 auto-resolve。客户端无需跟踪超时。

## 限制｜ Limitations

某些 `ExtensionUIContext` 方法在 RPC 模式下不受支持或功能降级，因为它们需要直接访问终端 UI ：

- `custom()` 返回 `undefined`。
- `onTerminalInput()` 返回一个 no-op 取消订阅函数。
- `setWorkingMessage()`、`setWorkingVisible()`、`setWorkingIndicator()`、`setHiddenThinkingLabel()`、`setFooter()`、`setHeader()`、`addAutocompleteProvider()`、`setEditorComponent()` 和 `setToolsExpanded()` 都是 no-ops。
- `getEditorText()` 返回 `""`，`getEditorComponent()` 返回 `undefined`。
- `getToolsExpanded()` 返回 `false`。
- `pasteToEditor()` 委托给 `setEditorText()`，但不处理终端粘贴。
- `getAllThemes()` 返回 `[]`，`getTheme()` 返回 `undefined`。
- `setTheme()` 返回 `{ success: false, error: "Theme switching not supported in RPC mode" }`。

注意：在 RPC 模式下，`ctx.mode` 为 `"rpc"`，`ctx.hasUI` 为 `true`，因为对话框和 fire-and-forget 方法可通过扩展 UI sub-protocol 正常工作。使用 `ctx.mode === "tui"` 来保护 TUI 特有的功能，例如需要真实终端的 `custom()`。

## 来自 Pi 的请求｜ Requests from Pi

所有请求都有 `type: "extension_ui_request"`、唯一的 `id` 以及一个 `method` 字段。

### select ｜ select

提示用户从列表中进行选择。带有 `timeout` 字段的对话框方法会包含以毫秒为单位的超时；如果客户端未及时响应，代理将使用 `undefined` auto-resolves。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-1",
  "method": "select",
  "title": "Allow dangerous command?",
  "options": ["Allow", "Block"],
  "timeout": 10000
}
```

预期响应：`extension_ui_response`，其中 `value` (所选选项字符串) 或 `cancelled: true`。

### confirm ｜ confirm

提示用户进行是/否确认。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-2",
  "method": "confirm",
  "title": "Clear session?",
  "message": "All messages will be lost.",
  "timeout": 5000
}
```

预期响应：`extension_ui_response`，带有 `confirmed: true/false` 或 `cancelled: true`。

### input ｜ input

提示用户输入 free-form 文本。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

预期响应：`extension_ui_response`，带有 `value` (输入的文本) 或 `cancelled: true`。

### editor ｜ editor

打开一个 multi-line 文本编辑器，可选预填充内容。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

预期响应：`extension_ui_response`，带有 `value` (编辑后的文本) 或 `cancelled: true`。

### notify ｜ notify

显示通知。即发即忘（ Fire-and-forget），不预期响应。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` 字段为 `"info"`、`"warning"` 或 `"error"`。省略时默认为 `"info"`。

### setStatus

在页脚/状态栏中设置或清除状态条目。即发即忘（ Fire-and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

发送 `statusText: undefined` (或省略它) 以清除该键的状态条目。

### setWidget

设置或清除显示在编辑器上方或下方的组件 (文本行块)。即发即忘（ Fire-and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-7",
  "method": "setWidget",
  "widgetKey": "my-ext",
  "widgetLines": ["--- My Widget ---", "Line 1", "Line 2"],
  "widgetPlacement": "aboveEditor"
}
```

发送 `widgetLines: undefined` (或省略它) 以清除组件。`widgetPlacement` 字段为 `"aboveEditor"` (默认) 或 `"belowEditor"`。RPC 模式下仅支持字符串数组；组件工厂会被忽略。

### setTitle

设置终端窗口/标签页标题。即发即忘（ Fire-and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

### set_editor_text

设置输入编辑器中的文本。即发即忘（ Fire-and-forget）。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

## 对 Pi 的响应

仅对对话框方法发送响应 (`select`、`confirm`、`input`、`editor`)。`id` 必须与请求匹配。

### 值响应 (select、input、editor)

```json
{"type": "extension_ui_response", "id": "uuid-1", "value": "Allow"}
```

### 确认响应 (confirm)

```json
{"type": "extension_ui_response", "id": "uuid-2", "confirmed": true}
```

### 取消响应 (任意对话框)

关闭任意对话框的方法。扩展会收到 `undefined` (用于 select/input/editor) 或 `false` (用于 confirm)。

```json
{"type": "extension_ui_response", "id": "uuid-3", "cancelled": true}
```

## 示例

请参阅已勾选的 [RPC 扩展 UI 客户端](../examples/rpc-extension-ui.ts) 及其 [演示扩展](../examples/extensions/rpc-demo.ts)。

导出的请求和响应联合类型定义在 [`rpc-types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-types.ts) 中。有关 mode-independent 扩展指南，请参阅 [Extensions](extensions.md#ui-and-modes)。
