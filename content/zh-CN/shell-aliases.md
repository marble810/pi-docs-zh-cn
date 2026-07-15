# Shell 别名｜Shell Aliases

Pi 在 non-interactive 模式下运行 bash (`bash -c`)，默认情况下不会展开别名。

要启用 shell 别名，请添加到 `~/.pi/agent/settings.json`：

```json
{
  "shellCommandPrefix": "shopt -s expand_aliases\neval \"$(grep '^alias ' ~/.zshrc)\""
}
```

调整路径 (`~/.zshrc`, `~/.bashrc` 等) 以匹配你的 shell 配置。
