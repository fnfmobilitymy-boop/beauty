# Windows 免费本地测试

不需要服务器、域名或 GitHub 部署密钥。网站只开放在本机 127.0.0.1。真实 AI 请求仍由你的模型服务按用量收费；不配置 AI 密钥，也可以使用免费示例测试编辑器、代码运行、前后端预览、账户和后台。

## 1. 安装并启动 Docker Desktop

从 Docker 官方网站下载安装 Docker Desktop，使用 Linux containers / WSL 2 模式。按安装程序要求重启，打开 Docker Desktop 等到 Engine running。建议电脑至少 8 GB 内存并留有足够磁盘空间用于镜像；不需要另装 Node.js 或 Python。

官方下载：https://www.docker.com/products/docker-desktop/

## 2. 下载项目并解压

GitHub 仓库 fnfmobilitymy-boop/beauty → Code → Download ZIP。完整解压到本地文件夹，例如 C:\KDWeb。不要直接在 ZIP 里运行，也尽量不要放在云同步目录。

## 3. 双击 Start-Local.cmd

首次运行会下载镜像、构建受控运行环境并启动网站和私有运行器。请等待完成，不要在构建期间关闭窗口。脚本会自动打开浏览器。默认入口：

- 前台：`http://127.0.0.1:3000/`
- 代码工作区：`http://127.0.0.1:3000/studio`
- 管理后台：`http://127.0.0.1:3000/admin`

这些是你电脑启动后的本地地址，不是已经上线的公网网址。请使用 127.0.0.1，不要把地址改成其他主机名。

如果 3000 端口被占用，编辑 deploy/.private/local/compose.env，把 KD_LOCAL_PORT 改为 3001，再次运行脚本并按新端口访问。

## 4. 不花 AI 费用先测试

1. 在首页注册账号并登录，密码由你自己设置。
2. 进入“AI 开发工作区”，点击“创建免费本地示例”。
3. 命令栏已填入 npm test，点击“运行”，应看到测试通过。
4. 点击“启动前后端预览”，在示例网页点击按钮，后台计数应增加。
5. 尝试编辑、保存、查看变更、恢复版本、ZIP 导出及导入。

示例不调用 AI，不访问外网。预览最多 15 分钟；其内部运行状态不是生产数据库托管。

## 5. 设置后台管理员

先注册你控制的 hello@kennystudio.cfd。双击 Local-Admin.cmd，脚本会暂停本地 app，列出已注册账号。输入你自己账号的编号，确认邮箱后输入 YES；完成后会重新启动 app。重新登录后台即可管理充值、报价及 Credits。

不会自动给第一个注册账号管理员权限，也不会为你生成账号密码。取消或选错时不要输入 YES。脚本提示失败时会恢复 app，但不会假装已授权成功。

## 6. 可选：启用真实 AI

用记事本打开 deploy/.private/local/app.env（UTF-8），只在 KD_AI_API_KEY= 后填写你自己的真实模型 API Key。不要把密钥发到聊天或上传到 GitHub。保存后双击 Start-Local.cmd 重新创建应用容器。

不要复制当前云环境里的代理占位值到本机。没有有效密钥时 AI 生成功能会提示未配置；免费示例和手动代码工具仍可测试。脚本不自动启用 Credits 扣费，也不应真实转账充值进行本地测试。

## 7. 停止及保留数据

双击 Stop-Local.cmd 停止容器，账号、项目和 SQLite 数据卷会保留。下次运行 Start-Local.cmd 会继续使用已有数据。不要删除 Docker Desktop 中的 kdweb-local 数据卷，也不要执行带 -v 的 down 命令。

本地数据卷与后期服务器部署的数据卷分开。deploy/.private 中的密钥文件被 Git 排除；不要自行打包分享该目录或数据库备份。

## 验证范围

配置生成、免费示例、Compose 拓扑和应用流程可在 Linux Docker 环境自动验证；Windows .cmd 脚本仍需要在你的实际 Windows/Docker Desktop 上首次试跑。若报错，请提供错误文字或截图，不要附带密钥文件。
