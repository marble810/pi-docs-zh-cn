# Windows 设置｜Windows Setup

Pi 在 Windows 上需要一个 bash shell。按顺序检查的位置 (依次为)：

1. 来自 `~/.pi/agent/settings.json` 的自定义路径
2. Git Bash (`C:\Program Files\Git\bin\bash.exe`)
3. `bash.exe` 在 PATH (Cygwin、MSYS2、WSL)

对于大多数用户来说，[Git for Windows](https://git-scm.com/download/win) 就足够了。

## 自定义 Shell 路径

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```
