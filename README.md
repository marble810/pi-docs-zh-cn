# Pi 简体中文文档社区翻译站点

> **非官方社区翻译** — 本文档站点是 [Pi](https://pi.dev) 官方文档的中文社区翻译，由志愿者基于上游仓库 [earendil-works/pi](https://github.com/earendil-works/pi) 的内容进行翻译和维护。

## 项目定位

自动化的中文化文档同步/翻译流水线。当上游文档更新时，系统自动检测变更、调用 LLM 翻译新内容、生成站点数据并部署到 GitHub Pages。

## 免责声明

本项目与 Pi 官方团队无直接关联。翻译内容仅供参考，可能存在延迟或不准确之处。如需最新信息，请参阅[官方英文文档](https://pi.dev/docs/latest)。

## 上游来源

- **仓库**: [earendil-works/pi](https://github.com/earendil-works/pi)
- **分支**: `main`
- **文档路径**: `packages/coding-agent/docs`
- **源站点**: https://pi.dev/docs/latest

## 许可与署名

- 本项目代码基于 MIT 许可发布。
- 上游文档内容版权归其原作者所有。
- 翻译内容基于相同的许可条款提供。

## 技术栈

| 类别     | 技术                                                  |
| -------- | ----------------------------------------------------- |
| 框架     | [SvelteKit](https://kit.svelte.dev/) (静态适配器)     |
| 包管理   | [pnpm](https://pnpm.io/)                              |
| 语言     | TypeScript                                            |
| 翻译引擎 | [DeepSeek](https://deepseek.com/) (deepseek-v4-flash) |
| 样式     | CSS (无框架)                                          |
| 测试     | Vitest (单元/集成), Playwright (E2E)                  |
| CI/CD    | GitHub Actions                                        |
| 托管     | GitHub Pages                                          |

## 仓库结构

```
pi-docs-zh-cn/
├── .github/workflows/    # CI/CD 工作流
├── config/               # 配置文件
│   ├── upstream.yml      # 上游仓库配置
│   ├── glossary.yml      # 翻译术语表
│   ├── translation-policy.yml  # 翻译策略
│   ├── translation-prompt.md   # LLM 翻译提示词
│   └── navigation-overrides.yml # 导航覆盖
├── content/
│   ├── en/               # 上游英文文档 (同步后)
│   └── zh-CN/            # 中文翻译输出
├── scripts/
│   ├── cli.ts            # CLI 入口 (sync/check/resume)
│   ├── extract-segments.ts    # 文档分段
│   ├── protect-tokens.ts      # 占位符保护
│   ├── generate-site-data.ts  # 站点数据生成
│   ├── validate-content.ts    # 内容验证
│   ├── scan-secrets.ts        # 密钥扫描
│   └── lib/
│       ├── config.ts     # 配置加载
│       ├── paths.ts      # 路径常量
│       └── types.ts      # TypeScript 类型定义
├── src/                  # SvelteKit 应用代码
├── static/
│   └── docs-assets/      # 上游文档静态资源
├── state/                # 运行时状态
├── tests/
│   ├── unit/             # 单元测试
│   ├── integration/      # 集成测试
│   ├── e2e/              # E2E 测试
│   └── fixtures/         # 测试夹具
├── playwright.config.ts  # Playwright 配置
├── svelte.config.js      # SvelteKit 配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── eslint.config.js      # ESLint 配置
├── prettier.config.js    # Prettier 配置
├── .nvmrc                # Node.js 版本
└── package.json
```

## 本地安装

```bash
# 克隆仓库
git clone https://github.com/earendil-works/pi-docs-zh-cn.git
cd pi-docs-zh-cn

# 使用正确的 Node.js 版本
nvm use  # 或手动安装 .nvmrc 中指定的版本

# 安装依赖
pnpm install
```

## 本地开发

```bash
# 启动开发服务器
pnpm dev

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 类型检查
pnpm check

# 运行所有测试
pnpm test

# 仅运行单元测试
pnpm test:unit

# 仅运行集成测试
pnpm test:integration

# 运行 E2E 测试 (需要先构建)
pnpm build
pnpm test:e2e

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

## DeepSeek API Key 设置

翻译功能需要 DeepSeek API 密钥。

### 本地开发

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env，填入你的 API 密钥
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### GitHub Secrets

在仓库 Settings → Secrets and variables → Actions 中添加：

| 名称               | 描述                                |
| ------------------ | ----------------------------------- |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（同步工作流使用） |

## GitHub Pages 设置

1. 前往仓库 Settings → Pages
2. Source 选择 **GitHub Actions**
3. 确保有 `workflow_dispatch` 权限

## 首次同步

```bash
# 检查上游变更
pnpm sync:check

# 执行首次同步（含翻译）
pnpm sync:run

# 生成站点数据
pnpm generate:site

# 构建并预览
pnpm build && pnpm preview
```

或通过 GitHub Actions：

1. 前往 Actions → Site → Run workflow
2. 勾选 `force_sync` 和 `force_retranslate`
3. 点击 Run workflow

## 日常同步

每日自动检查（UTC 03:17）：仅当 Pi 发布新版本时才检测上游文档变更并同步。

## 手动同步

```bash
pnpm sync:force   # 强制重新同步
pnpm sync:run     # 仅同步变更
```

或通过 GitHub Actions 的 workflow_dispatch 触发。

## 强制重新翻译

```bash
# 本地
FORCE_RETRANSLATE=true pnpm sync:run

# 或通过 workflow_dispatch，勾选 force_retranslate
```

## 翻译记忆

翻译记忆存储在 `state/translation-memory.jsonl` 文件中，每条记录包含：

- 源文本哈希
- 上下文哈希
- 翻译结果
- 使用的模型
- 翻译时间

相同哈希的片段会直接从记忆库中读取，避免重复翻译。

## 检查点/恢复

翻译过程中断时，系统会自动保存检查点到 `state/pending-sync.json`：

```bash
# 恢复中断的翻译
pnpm translate:resume
```

恢复时跳过已完成片段，只翻译未完成的片段。

## 术语表编辑

编辑 `config/glossary.yml` 可添加、修改或删除术语翻译：

```yaml
version: 1
preserve:
  - Pi
  - SvelteKit
terms:
  "agent": "智能体"
  "deployment": "部署"
```

修改 Glossary 版本号后，所有片段将重新翻译。

## 策略版本

`translation-policy.yml` 中的 `version` 字段控制翻译缓存的有效性：

- 策略版本变化 → 所有缓存失效
- 提示词变化 → 所有缓存失效
- Glossary 版本变化 → 所有缓存失效

## 配额限制

| 限制               | 值            |
| ------------------ | ------------- |
| 每批最大片段数     | 24            |
| 每批最大字符数     | 20,000        |
| 每批最大文件数     | 2             |
| 每次运行最大请求数 | 35            |
| 最大并发数         | 8             |
| 模型上下文长度     | 32,768 tokens |

## 故障恢复

| 故障模式       | 恢复策略                             |
| -------------- | ------------------------------------ |
| 翻译中途中断   | 检查点恢复 (`pnpm translate:resume`) |
| 模型返回非中文 | 自动重试，切换模型                   |
| 占位符损坏     | 检测到占位符丢失时重试该片段         |
| 网络传输错误   | 自动重试当前模型                     |
| 配额耗尽       | 等待下一运行周期                     |
| 上游变更冲突   | 自动合并，冲突时优先采用上游版本     |

## 本地测试

```bash
# 运行所有测试
pnpm test

# 仅单元测试
pnpm test:unit

# 仅集成测试
pnpm test:integration

# E2E 测试
pnpm build
pnpm test:e2e

# 内容验证
pnpm validate:content

# 密钥扫描
pnpm security:scan
```

## 生产构建

```bash
# 完整构建流程
pnpm generate:site   # 生成站点数据
pnpm build           # 构建静态站点
pnpm preview         # 本地预览

# 生产构建使用 BASE_PATH
BASE_PATH=/pi-docs-zh-cn pnpm build
```

## 已知限制

- **翻译质量**: LLM 翻译可能存在不准确之处，尤其是技术术语和上下文依赖的表述。
- **同步延迟**: 最大延迟为 24 小时（每日同步一次）。
- **免费模型可用性**: OpenRouter 上的免费模型可能随时变更或下线。
- **配额限制**: 免费 API 有速率和配额限制，大文档可能需要多次运行。
- **SEO**: 静态站点对搜索引擎的可见性受限于 GitHub Pages 的设置。
- **无搜索服务器**: 站内搜索完全基于客户端 MiniSearch，不适用于大型文档集。
- **单一目标语言**: 当前仅支持简体中文 (zh-CN)。
