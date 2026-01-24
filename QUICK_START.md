# 快速开始：部署到 Vercel

本指南将帮助你在 10 分钟内将 SimpleWeek 部署到 Vercel。

## 前提条件

确保你已经准备好以下账号和信息：

1. **GitHub 账号**（代码托管）
2. **Vercel 账号**（部署平台，使用 GitHub 登录）
3. **Neon 数据库**连接字符串
4. **Clerk 认证**密钥（Secret Key 和 Publishable Key）
5. **Supabase 存储**配置（URL 和 Service Role Key）

如果还没有准备好这些服务，请先参考 `README.md` 中的"部署指南"部分。

## 第一步：推送代码到 GitHub

项目已经配置好所有 Vercel 部署所需的文件，现在只需要推送到 GitHub：

```bash
# 使用提供的部署脚本（推荐）
./deploy.sh

# 或者手动执行
git add .
git commit -m "feat: add Vercel deployment configuration"
git push origin main
```

## 第二步：在 Vercel 创建项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New..."** → **"Project"**
3. 找到并导入 `simple-week` 仓库
4. Framework Preset 选择 **"Other"**

## 第三步：配置环境变量

在 Vercel 项目配置页面，添加以下环境变量（所有环境都要添加）：

```
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
CLERK_SECRET_KEY=sk_test_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
NODE_ENV=production
```

**提示**：可以从你的 `.env` 文件中复制这些值。

## 第四步：部署

点击 **"Deploy"** 按钮，等待 2-3 分钟完成构建和部署。

## 第五步：初始化数据库

部署成功后，需要创建数据库表：

```bash
# 确保 .env 文件包含 DATABASE_URL
pnpm db:push
```

## 第六步：配置 Clerk

1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 进入你的应用设置
3. 在 **"Paths"** 中添加你的 Vercel 域名：
   - `https://your-app.vercel.app`
   - `https://*.vercel.app`

## 第七步：测试

访问你的 Vercel 部署 URL，测试登录和基本功能。

## 完成！

现在你的 SimpleWeek 应用已经成功部署到 Vercel 了！🎉

## 遇到问题？

- 查看 `VERCEL_DEPLOYMENT.md` 了解详细配置说明
- 查看 `DEPLOYMENT_CHECKLIST.md` 确认所有步骤
- 查看 Vercel 部署日志排查错误

## 自动部署

从现在开始，每次推送代码到 GitHub 的 `main` 分支，Vercel 都会自动重新部署你的应用。

## 下一步

- 配置自定义域名
- 优化性能和 SEO
- 添加更多功能
- 集成监控和分析工具
