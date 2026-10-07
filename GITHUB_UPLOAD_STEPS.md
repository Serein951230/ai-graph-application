# GitHub 仓库上传步骤

## 1. 创建空仓库

打开 [GitHub](https://github.com/)，登录账号，新建仓库。

建议仓库名：

```text
ai-graph-application
```

创建时不要勾选 README、.gitignore 或 License，因为本地项目已经有这些文件。

## 2. 在本地项目文件夹执行

打开 PowerShell，进入源码仓库：

```powershell
cd "C:\Users\Lenovo\Desktop\AI图谱应用-源码仓库"
```

把下面地址换成你新建仓库的地址：

```powershell
git remote add origin https://github.com/你的用户名/ai-graph-application.git
git branch -M main
git push -u origin main
```

## 3. 比赛平台填写

如果平台要求“源码仓库链接”，填写 GitHub 仓库页面地址。

如果平台要求“程序压缩包”，上传桌面上的提交包或打包后的 `release` 文件夹压缩包。

