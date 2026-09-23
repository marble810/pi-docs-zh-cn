# Pi 包｜ Packages

Pi 包将扩展、技能、提示词模板和主题作为一个单元进行安装和分发。当某项自定义内容需要通过 npm or git 共享，或者多个资源属于同一整体时，请使用包。

包是一个普通目录或 npm package.。它可以公开常规资源目录，在 `package.json` 中的 `pi` 键下声明显式路径，并携带自己的运行时依赖。

## 安装和管理包｜ Install and manage packages

从 npm、git 或本地路径安装：

```bash
pi install npm:@example/pi-tools@1.0.0
pi install git:github.com/example/pi-tools@v1
pi install ./local-package
```

`pi list` 显示已配置的包。使用 `pi remove <source>` 移除某个包，使用 `pi update --extensions` 协调包安装。有关所有包命令和选项，请参阅 [命令行](cli.md#package-commands)。

个人安装会写入 `~/.pi/agent/settings.json`。添加 `--local` 或 `-l` 可将包声明写入 `.pi/settings.json`。只有在授予项目信任后，Pi 才会从该文件读取声明。

只有在项目信任得到解决后，才会安装和加载项目包。包可以执行扩展代码，并且可以包含指示模型运行程序的技能。在安装 third-party 包 source before 之前请先审查。在授予项目信任之前，请审查项目包声明。

使用 `--extension` 或 `-e` 可在单次调用中试用某个包，而无需将其添加到设置中：

```bash
pi -e npm:@example/pi-tools
```

## 选择来源｜ Choose a source

| 来源 | 示例 | 行为 |
|---|---|---|
| npm | `npm:@example/pi-tools@1.0.0` | 安装在 Pi npm directory 下 |
| git | `git:github.com/example/pi-tools@v1` | 克隆并协调到所选 ref |
| URL | `https://github.com/example/pi-tools` | 视为 git source |
| 本地 | `./pi-tools` | 从解析后的路径加载，不进行复制 |

带版本的 npm specifications 会被固定。Git 标签和提交也会被固定；包更新会协调检出内容，但不会移动已配置的引用。

相对本地路径从包含它们的设置文件所在位置解析。文件路径加载一个扩展。目录遵循常规的包发现规则。

## 创建包

最简单的包使用常规目录：

```text
my-pi-package/
├── package.json
├── extensions/
├── skills/
├── prompts/
└── themes/
```

没有 `pi` 清单时，Pi 会从这些目录中发现 TypeScript 和 JavaScript 扩展、技能目录、Markdown 提示词以及 JSON 主题。

当资源位于其他位置或需要过滤时，使用显式清单：

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./src/extension.ts"],
    "skills": ["./resources/skills"],
    "prompts": ["./resources/prompts/*.md"],
    "themes": ["./resources/themes/*.json"]
  }
}
```

路径相对于包根目录。数组接受 glob 模式和排除项。当通过 glob 遍历无法发现 dot-prefixed 或符号链接的资源根目录时，请直接列出它们。

`pi-package` 关键字使 npm package 有资格在 [Pi 包库](https://pi.dev/packages) 中被发现。可选的 `pi.image` 和 `pi.video` 字段可添加包库预览。

## 声明依赖

将扩展导入的运行时包放入 `dependencies`。Pi 在安装 npm or git source. 时会安装包依赖

Pi 向扩展和技能提供这些包：

- `@earendil-works/pi-ai`
- `@earendil-works/pi-agent-core`
- `@earendil-works/pi-coding-agent`
- `@earendil-works/pi-tui`
- `typebox`

在 `peerDependencies` 中声明导入的 Pi 包，并指定 `"*"` 范围，不要将它们打包。用作依赖的其他 Pi 包必须包含在发布的 tarball 中，并通过其 `node_modules` 资源路径引用。

已安装的包以独立的模块根加载。不要依赖两个包共享同一个依赖实例，也不要依赖一个包解析另一个包未声明的依赖。

## 选择包资源

设置中的对象形式会限定从包中加载哪些资源：

```json
{
  "packages": [
    {
      "source": "npm:@example/pi-tools",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"]
    }
  ]
}
```

对于每种资源类型：

- 省略该属性可加载包所允许的所有内容。
- 使用 `[]` 不加载该类型的任何内容。
- 使用 `!pattern` 排除 glob 匹配项。
- 使用 `+path` 包含一个精确的允许路径。
- 使用 `-path` 排除一个精确路径。

过滤器会缩小包清单的范围。它们不会暴露包本身未声明的资源。

运行 `pi config` 以启用或禁用已发现的资源。它从个人配置开始；按 Tab 切换作用域，或运行 `pi config --local` 以项目覆盖开始。

## 理解作用域与标识

同一个包可以同时出现在个人设置和项目设置中。项目条目通常会替换个人条目。使用 `autoload: false` 时，项目条目则作为对个人包的过滤增量。

Pi 通过包名标识 npm packages，通过不含 ref 的仓库 URL 标识  git packages，并通过解析后的绝对路径标识本地包。这可以防止同一个包通过等效声明被加载两次。

使用 [Extensions](extensions.md)、[Skills](skills.md)、[Prompt Templates](prompt-templates.md) 和 [Themes](themes.md) 在打包每种资源之前先设计它。
