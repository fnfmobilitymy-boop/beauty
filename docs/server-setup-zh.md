# 测试服务器开通与自动部署

## 推荐服务器

DigitalOcean，新加坡区域，Ubuntu 24.04 LTS，2 vCPU / 4 GB RAM / 80 GB SSD，固定公网 IPv4。无需 GPU，测试阶段无需买域名。选择页面实际显示的费用；本项目没有替你购买服务器。此配置用于初期测试，付费生产运行需要进一步隔离执行服务与账户账本。

1. 在 DigitalOcean 创建账号并完成账单验证。
2. 创建 Droplet，选择新加坡、上述 Ubuntu 与资源配置。
3. 选择 SSH Key 登录。公钥放入服务器；私钥只放在你的本机或 GitHub Secrets，不能发到聊天或提交到仓库。
4. 服务器防火墙开放 80/443。SSH 22 需要允许管理和 GitHub Actions 连接；如果限制来源 IP，应确保 CI 出口在允许范围内。不要启用密码 SSH 登录来绕过部署问题。
5. 按 Docker 官方 Ubuntu 安装文档安装 Docker Engine、Buildx、Compose 插件，并确认部署用户可以运行 `docker info` 与 `docker compose version`。该账号控制 Docker，应只用于可信部署。

Docker 官方安装文档：https://docs.docker.com/engine/install/ubuntu/

## 配置 GitHub

仓库：fnfmobilitymy-boop/beauty。

在 Settings → Secrets and variables → Actions 配置以下 Repository secrets：

| 名称 | 内容 |
| --- | --- |
| DEPLOY_HOST | 服务器公网 IPv4 或 SSH 主机名 |
| DEPLOY_USER | SSH 部署用户名 |
| DEPLOY_SSH_KEY | 专用部署私钥，自动部署需要可非交互使用 |
| DEPLOY_KNOWN_HOSTS | 已通过服务器控制台等可信渠道核对的 SSH 主机公钥记录 |
| KD_AI_API_KEY | 你自己的真实模型 API Key，不是当前云代理占位值 |

不能使用 StrictHostKeyChecking=no，也不能仅凭未核实的 ssh-keyscan 输出信任服务器。请在服务器控制台核对主机指纹后，保存对应 known_hosts 记录。

可选 Repository variable：DEPLOY_PUBLIC_HOST。留空且 DEPLOY_HOST 为公网 IPv4 时，部署会使用 `kd-web.<公网IPv4>.sslip.io` 作为临时域名。这里是格式说明，尚未生成实际地址。

## 执行部署

代码必须先推送到 main。CI 成功后会触发 `Deploy website to Docker server`，也可在 Actions 手动执行。没有上述 secrets 时，部署会明确失败，不会伪造上线成功。

工作流会：验证模型 API 访问、校验代码、使用核实过的 SSH 主机密钥上传源码、保存私有配置、构建受控运行镜像、备份已有 SQLite 数据、启动 Web/独立运行器/HTTPS 网关，并检查前台、工作区和后台网址。第一次部署目录为 SSH 用户主目录下的 kd-web；已有但未标记为受管的目录不会被覆盖。

前台、工作区和后台实际通过 HTTPS 检查后，网址才会写入该次 Actions 的 Summary。GitHub Actions 只是部署执行器，不能替代服务器。

## 首次管理员设置

1. 在部署成功的网站注册你控制的 hello@kennystudio.cfd，密码由你自己设置。
2. SSH 登录服务器并进入 `~/kd-web`。
3. 停止 app，避免另一个进程修改账号配置：

```sh
docker compose --env-file deploy/.env -f deploy/compose.yml stop app
docker compose --env-file deploy/.env -f deploy/compose.yml run --rm app node admin-cli.mjs list
```

4. 找到该账号对应的 ID，再执行（替换 ACCOUNT_ID）：

```sh
docker compose --env-file deploy/.env -f deploy/compose.yml run --rm app node admin-cli.mjs bind ACCOUNT_ID
docker compose --env-file deploy/.env -f deploy/compose.yml up -d app
```

角色会写入 SQLite 并保留，不能把邮箱字符串当账号 ID。不要绑定你不控制的账号。

## 测试与数据

初次上线先保持 Credits 扣费关闭，使用模拟付款申报测试，不要让顾客真实充值。原 Logo 和收款二维码图片仍待提供；邮件找回、GitHub OAuth 和客户生产站点发布尚未接入。

私有配置在 deploy/.private 下，权限受限并被源码包与 Git 排除。平台 SQLite 在命名卷中，更新容器会保留。不要运行 `docker compose down -v`，那会删除数据卷。在线备份使用项目提供的 SQLite backup API；不要只复制正在写入的数据库主文件。
