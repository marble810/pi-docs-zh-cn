# 开发

请参阅 [AGENTS.md](https://github.com/earendil-works/pi-mono/blob/main/AGENTS.md) 以获取更多指南。

## 设置

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

脚本可以从任何目录运行。Pi 保留调用者的当前工作目录。

## 分叉 / 重新品牌化

通过 `package.json` 配置：

```json
{
  "piConfig": {
    "name": "pi",
    "configDir": ".pi"
  }
}
```

修改 `name`、`configDir` 和 `bin` 字段以适配您的分叉。影响 CLI 横幅、配置路径和环境变量名称。

## 路径解析

三种执行模式： npm install、独立二进制文件、 tsx from 源代码。

**始终使用 `src/config.ts`** 引用包资产：

```typescript
import { getPackageDir, getThemeDir } from "./config.js";
```

切勿直接使用 `__dirname` 引用包资产。

## 调试命令

`/debug` (隐藏)写入 `~/.pi/agent/pi-debug.log`：
- 渲染的 TUI 行及 ANSI 代码
- 最后发送给 LLM 的消息

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
