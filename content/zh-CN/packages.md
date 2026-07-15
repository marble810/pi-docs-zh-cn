> pi 可帮助您创建 pi 包。请让它打包您的扩展、技能、提示词模板或主题。

# Pi 包｜Pi Packages

Pi 包将扩展、技能、提示词模板和主题打包，以便您可以通过 npm or git 共享它们。包可以在 `pi` 键下的 `package.json` 中声明资源，或使用常规目录。

## 目录

- [安装与管理](#install-and-manage)
- [包来源](#package-sources)
- [创建 Pi 包](#creating-a-pi-package)
- [包结构](#package-structure)
- [依赖项](#dependencies)
- [包过滤](#package-filtering)
- [启用和禁用资源](#enable-and-disable-resources)
- [作用域与去重](#scope-and-deduplication)

## 安装与管理

> **安全：** Pi 包以完全系统权限运行。扩展执行任意代码，技能可以指示模型执行任何操作，包括运行可执行文件。在安装 third-party 包之前，请检查 source code。

```bash
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install https://github.com/user/repo  # raw URLs work too
pi install /absolute/path/to/package
pi install ./relative/path/to/package

pi remove npm:@foo/bar
pi list                     # show installed packages from settings
pi update                   # update pi only
pi update --all             # update pi, update packages, and reconcile pinned git refs
pi update --extensions      # update packages and reconcile pinned git refs only
pi update --self            # update pi only
pi update --self --force    # reinstall pi even if current
pi update npm:@foo/bar      # update one package
pi update --extension npm:@foo/bar
```

这些命令管理 pi 包，`pi update` 可以更新 pi CLI 安装。要卸载 pi 本身，请参见 [快速入门](quickstart.md#uninstall)。

默认情况下，`install` 和 `remove` 写入用户设置 (`~/.pi/agent/settings.json`)。使用 `-l` 写入项目设置 (`.pi/settings.json`)。项目设置可以与团队共享，并且项目受信任后， pi 在启动时会自动安装任何缺少的包。

要尝试一个包而不安装它，请使用 `--extension` 或 `-e`。这会将包安装到临时目录，仅用于当前运行：

```bash
pi -e npm:@foo/bar
pi -e git:github.com/user/repo
```

## 包来源

Pi 接受设置和 `pi install` 中的三种 source types。

### npm

```
npm:@scope/pkg@1.2.3
npm:pkg
```

- 带版本的规范会被锁定，并且在包更新时跳过 (`pi update --extensions`, `pi update --all`)。
- 用户安装位于 `~/.pi/agent/npm/`。
- 项目安装位于 `.pi/npm/`。
- 在 `settings.json` 中设置 `npmCommand`，将 npm package 的查找和安装操作固定在特定的包装命令上，例如 `mise` 或 `asdf`。

示例：

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

### git

```
git:github.com/user/repo@v1
git:git@github.com:user/repo@v1
https://github.com/user/repo@v1
ssh://git@github.com/user/repo@v1
```

- 没有`git:`前缀，只接受协议 URL(`https://`、`http://`、`ssh://`、`git://`)。
- 使用`git:`前缀时，接受简写格式，包括`github.com/user/repo`和`git@github.com:user/repo`。
- HTTPS和SSHURL 均受支持。
- SSHURL 自动使用您配置的SSH密钥(并遵循`~/.ssh/config`)。
- 对于non-interactive运行(例如 CI)，您可以设置`GIT_TERMINAL_PROMPT=0`来禁用凭据提示，并设置`GIT_SSH_COMMAND`(例如`ssh -o BatchMode=yes -o ConnectTimeout=5`)来快速失败。
- 引用是固定的标签或提交。`pi update --extensions`和`pi update --all`不会将它们移到更新的引用，但会将现有克隆与配置的引用进行协调。
- 使用`pi install git:host/user/repo@new-ref`更新设置并将现有包移动到新的固定引用。
- 克隆到`~/.pi/agent/git/<host>/<path>`(全局)或`.pi/git/<host>/<path>`(项目)。
- 当协调更改检出时， pi 会重置并清理克隆，然后运行`npm install`（如果`package.json`存在）。

**SSH示例：**
```bash
# git@host:path shorthand (requires git: prefix)
pi install git:git@github.com:user/repo

# ssh:// protocol format
pi install ssh://git@github.com/user/repo

# With version ref
pi install git:git@github.com:user/repo@v1.0.0
```

### 本地路径

```
/absolute/path/to/package
./relative/path/to/package
```

本地路径指向磁盘上的文件或目录，并添加到设置中而不进行复制。相对路径根据其所在的设置文件进行解析。如果路径是文件，则作为单个扩展加载。如果是目录，则 pi 使用包规则加载资源。

## 创建Pi包

将`pi`清单添加到`package.json`或使用约定目录。包含`pi-package`关键字以便被发现。

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

路径相对于包根目录。数组支持 glob 模式和`!exclusions`。

### 画廊元数据

[包画廊](https://pi.dev/packages)显示标记了`pi-package`的包。添加`video`或`image`字段以显示预览：

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "video": "https://example.com/demo.mp4",
    "image": "https://example.com/screenshot.png"
  }
}
```

- **视频**：仅限MP4。在桌面上，悬停时自动播放。点击打开全屏播放器。
- **图像**：PNG、JPEG、GIF或WebP。显示为静态预览。

如果两者都设置了，视频优先。

## 包结构

### 约定目录

如果没有`pi`清单， pi 从以下目录auto-discovers资源：

- `extensions/`加载`.ts`和`.js`文件
- `skills/` 递归查找 `SKILL.md` 文件夹并加载 top-level `.md` 文件作为技能
- `prompts/` 加载 `.md` 文件
- `themes/` 加载 `.json` 文件

## 依赖

第三方运行时依赖应放在 `package.json` 的 `dependencies` 中。不注册扩展、技能、提示词模板或主题的依赖也应放在 `dependencies` 中。当 pi 从 npm or git 安装包时，它会运行 `npm install`，因此这些依赖会自动安装。

Pi 为扩展和技能捆绑了核心包。如果你导入了其中任何一个，将它们列在 `peerDependencies` 中，使用 `"*"` 范围，并且不要捆绑它们：`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`、`@earendil-works/pi-tui`、`typebox`。

其他 pi 包必须捆绑在你的 tarball 中。将它们添加到 `dependencies` 和 `bundledDependencies`，然后通过 `node_modules/` 路径引用它们的资源。Pi 使用单独的模块根加载包，因此单独的安装不会冲突或共享模块。

示例：

```json
{
  "dependencies": {
    "shitty-extensions": "^1.0.1"
  },
  "bundledDependencies": ["shitty-extensions"],
  "pi": {
    "extensions": ["extensions", "node_modules/shitty-extensions/extensions"],
    "skills": ["skills", "node_modules/shitty-extensions/skills"]
  }
}
```

## 包过滤

使用设置中的对象形式过滤包加载的内容：

```json
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"],
      "themes": ["+themes/legacy.json"]
    }
  ]
}
```

`+path` 和 `-path` 是相对于包根目录的精确路径。

- 省略某个键将加载该类型的所有内容。
- 使用 `[]` 不加载该类型的任何内容。
- `!pattern` 排除匹配项。
- `+path` force-includes 一个精确路径。
- `-path` force-excludes 一个精确路径。
- 过滤器位于清单之上。它们缩小了已允许的范围。

## 启用和禁用资源

使用 `pi config` 启用或禁用已安装包和本地目录中的扩展、技能、提示词模板和主题。`pi config` 从全局设置开始 (`~/.pi/agent/settings.json`)；按 Tab 在全局和 project-local 模式之间切换。使用 `pi config -l` 从项目覆盖开始 (`.pi/settings.json`)，继承的全局资源变暗显示。

## 作用域和去重

包可以同时出现在全局和项目设置中。如果同一个包同时出现在两者中，则项目条目优先，除非项目条目具有 `autoload: false`，在这种情况下，它将作为对全局条目的增量应用。身份由以下因素确定：

- npm: 包名
- git: 不带 ref 的仓库 URL
- local: 解析后的绝对路径
