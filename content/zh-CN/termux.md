# 在 Android 上通过 Termux 运行 Pi｜ Run on Android with Termux

Pi 通过 [Termux](https://termux.dev/) 在 Android 上运行， Termux 是一个终端模拟器和 Linux 环境。支持文本输入、文件工具和 shell 命令。Pi 可以通过 Termux:API 使用 Android 剪贴板复制和粘贴文本。不支持粘贴剪贴板图像。

## 开始之前｜ Before you begin

从 [GitHub 或 F-Droid](https://github.com/termux/termux-app#installation) 安装 Termux。不要使用已弃用的 Google Play 版本。

[Termux:API](https://github.com/termux/termux-api#installation) 是可选的。仅当你希望 Pi 复制或粘贴 Android 剪贴板文本，或 shell 命令需要 Android 设备 API 时才安装它。

## 安装 Pi｜ Install 

1. 更新 Termux 软件包：

 ```bash
   pkg update && pkg upgrade
   ```

2. 安装 Node.js 和 Git ：

 ```bash
   pkg install nodejs git
   ```

3. 安装 Pi：

 ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   ```

4. 验证安装：

 ```bash
   pi --version
   ```

5. 打开你想要在其中工作的文件夹并启动 Pi：

 ```bash
   cd /path/to/working-folder
   pi
   ```

继续阅读主 [Quickstart](quickstart.md#3-choose-a-model) 以连接模型并运行你的第一个任务。

## 访问 Android 共享存储｜ Access Android shared storage

在你授予权限之前， Termux 无法访问共享的 Android 存储。运行一次以下命令：

```bash
termux-setup-storage
```

批准后， Android 共享存储可在 `/storage/emulated/0` 下访问，也可通过 Termux 在 `~/storage/` 下创建的链接访问。

仅当 Pi 应能够访问这些文件时才授予此权限。在 Termux 中运行的命令和工具使用与 Termux 进程相同的存储权限。

## 使用剪贴板命令｜ Use clipboard commands

Pi 使用 `termux-clipboard-set` 复制文本，并使用 `termux-clipboard-get` 作为其 clipboard-paste 快捷键。Shell 命令可以直接使用这两个命令。安装 Termux:API 应用及其 command-line 软件包：

```bash
pkg install termux-api
```

验证集成：

```bash
printf 'Pi clipboard test' | termux-clipboard-set
termux-clipboard-get
```

第二条命令应输出 `Pi clipboard test`。

Termux 剪贴板 API 仅支持文本。Pi 的 clipboard-paste 快捷键会将该文本插入编辑器，但无法附加剪贴板中的图片。

## 添加 Termux 专用指令

Pi 会检测到自身运行在 Termux 中，但无法推断你希望它如何与 Android 交互。请仅将与你工作相关的环境细节添加到 `~/.pi/agent/AGENTS.md`：

````markdown
# Termux environment

- Pi runs in Termux on Android.
- Shared Android storage is under `/storage/emulated/0`.
- Open URLs with `termux-open-url "https://example.com"`.
- Open files with `termux-open <path>`.
- Do not access shared storage unless the task requires it.
````

在活动会话期间更改文件后，运行 `/reload`。

## 故障排除

### 剪贴板集成失败

确认你已安装两个组件：

1. 来自同一 source as Termux 的 Termux:API Android 应用
2. `termux-api` command-line 包

然后在 Pi 之外运行上面的剪贴板验证命令。如果在那里失败，请先修复 Termux:API 安装，再重试 Pi 的复制命令。

### 共享存储报告权限被拒绝

运行 `termux-setup-storage`，批准 Android 权限请求，然后重试 `~/storage/` 或 `/storage/emulated/0` 下的路径。

### 安装后找不到 Pi

打开一个新的 Termux shell 并运行：

```bash
npm prefix -g
command -v pi
```

确认全局 npm binary 目录位于 `PATH` 上，如果包缺失，则重新安装 Pi。
