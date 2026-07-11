# 开发

See [AGENTS.md](https://github.com/earendil-works/pi-mono/blob/main/AGENTS.md) for additional guidelines.

## 安装

```bash
git clone https://github.com/earendil-works/pi-mono
cd pi-mono
npm install
npm run build
```

从源码运行：

```bash
/path/to/pi-mono/pi-test.sh
```

该脚本可以从任何目录运行。Pi 会保留调用者的当前工作目录。

## 分支 / 重命名

Configure via `package.json`:

```json
{
  "piConfig": {
    "name": "pi",
    "configDir": ".pi"
  }
}
```

Change `name`, `configDir`, and `bin` field for your fork. Affects CLI banner, config paths, and environment variable names.

## 路径解析

三种执行模式： npm install、独立二进制文件、从源码使用 tsx。

**Always use `src/config.ts`** for package assets:

```typescript
import { getPackageDir, getThemeDir } from "./config.js";
```

Never use `__dirname` directly for package assets.

## 调试命令

`/debug` (hidden) writes to `~/.pi/agent/pi-debug.log`:

- 渲染后的 TUI 行（含 ANSI 代码）
- 发送给 LLM 的最后消息

## 测试

```bash
./test.sh                         # Run non-LLM tests (no API keys needed)
npm test                          # Run all tests
npm test -- test/specific.test.ts # Run specific test
```

## 项目结构

```
packages/
  ai/           # LLM provider abstraction
  agent/        # Agent loop and message types
  tui/          # Terminal UI components
  coding-agent/ # CLI and interactive mode
```
