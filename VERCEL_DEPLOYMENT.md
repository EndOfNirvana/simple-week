# Vercel 部署指南

本文档详细说明如何将 SimpleWeek 项目部署到 Vercel。

## 架构说明

SimpleWeek 使用以下架构在 Vercel 上部署：

- **前端**：静态文件部署到 Vercel CDN（`dist/client` 目录）
- **后端**：使用 Vercel Serverless Functions（`api/server.js`）
- **数据库**：Neon PostgreSQL（外部服务）
- **认证**：Clerk（外部服务）
- **存储**：Supabase Storage（外部服务）

## 配置文件说明

### 1. `vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": null,
  "outputDirectory": "dist/client",
  "rewrites": [
    {
      "source": "/api/trpc/:path*",
      "destination": "/api/server"
    }
  ],
  "functions": {
    "api/server.js": {
      "runtime": "nodejs20.x",
      "maxDuration": 10
    }
  }
}
```

**配置说明：**
- `buildCommand`: 执行 `pnpm build` 构建前端和后端
- `outputDirectory`: 前端静态文件输出到 `dist/client`
- `rewrites`: 将所有 `/api/trpc/*` 请求重写到 Serverless Function
- `functions`: 配置 Serverless Function 运行时和超时时间

### 2. `api/server.js`

这是 Vercel Serverless Function 的入口文件，导出构建后的 Express 应用：

```javascript
import app from "../dist/index.js";
export default app;
```

### 3. `server/index.ts` 修改

在原有代码基础上添加了以下内容：

```typescript
// Export for Vercel Serverless Functions
export default app;

// Start server in non-serverless environment
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
```

**说明：**
- 导出 Express app 供 Vercel Serverless Function 使用
- 只在非 Vercel 环境（本地开发）中启动 HTTP 服务器
- Vercel 环境通过 `VERCEL=1` 环境变量识别

## 部署步骤

### 第一步：推送代码到 GitHub

```bash
cd /path/to/simple-week

# 添加所有修改
git add .

# 提交修改
git commit -m "feat: add Vercel deployment configuration"

# 推送到 GitHub
git push origin main
```

### 第二步：在 Vercel 创建项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New..."** → **"Project"**
3. 选择 **"Import Git Repository"**
4. 找到并选择 `EndOfNirvana/simple-week` 仓库
5. 点击 **"Import"**

### 第三步：配置项目设置

在项目导入页面：

**Framework Preset**: 选择 **"Other"**（因为我们使用自定义配置）

**Root Directory**: 保持默认 `./`

**Build and Output Settings**: Vercel 会自动读取 `vercel.json` 配置

### 第四步：配置环境变量

在 **"Environment Variables"** 部分，添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Neon 数据库连接字符串 |
| `CLERK_SECRET_KEY` | `sk_test_...` | Clerk 后端密钥 |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Clerk 前端公钥 |
| `SUPABASE_URL` | `https://...supabase.co` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase 服务端密钥 |
| `NODE_ENV` | `production` | 环境标识 |

**重要提示：**
- 所有环境变量都应用于 **Production**、**Preview** 和 **Development** 环境
- 确保 `VITE_CLERK_PUBLISHABLE_KEY` 变量名正确（Vite 需要 `VITE_` 前缀）

### 第五步：部署

1. 点击 **"Deploy"** 按钮
2. 等待构建和部署完成（约 2-3 分钟）
3. 部署成功后，Vercel 会提供一个访问 URL（如 `https://simple-week.vercel.app`）

### 第六步：初始化数据库

部署完成后，需要初始化数据库表结构：

```bash
# 在本地项目目录
cd /path/to/simple-week

# 确保 .env 文件包含正确的 DATABASE_URL
# 推送数据库 schema
pnpm db:push
```

**或者使用 Vercel CLI：**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 拉取环境变量
vercel env pull .env.local

# 推送数据库 schema
pnpm db:push
```

### 第七步：配置 Clerk 回调 URL

1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 选择你的应用
3. 进入 **"Paths"** 设置
4. 添加你的 Vercel 域名到允许的域名列表：
   - `https://simple-week.vercel.app`（替换为你的实际域名）
   - `https://*.vercel.app`（允许所有预览部署）

### 第八步：测试部署

访问你的 Vercel 部署 URL，测试以下功能：

- ✅ 页面正常加载
- ✅ Clerk 登录/注册功能正常
- ✅ 创建和管理任务
- ✅ 上传图片到 Supabase
- ✅ 数据持久化到 Neon 数据库

## 常见问题

### 1. 构建失败

**问题**：`Error: Cannot find module 'xxx'`

**解决方案**：
- 检查 `package.json` 中是否包含所有依赖
- 确保 `pnpm-lock.yaml` 已提交到 Git

### 2. API 请求失败

**问题**：前端无法连接到后端 API

**解决方案**：
- 检查 `vercel.json` 中的 `rewrites` 配置是否正确
- 确保 `api/server.js` 文件存在并正确导出 Express app
- 查看 Vercel 部署日志中的错误信息

### 3. 环境变量未生效

**问题**：应用无法连接到数据库或其他服务

**解决方案**：
- 在 Vercel Dashboard 检查环境变量是否正确设置
- 确保环境变量应用于正确的环境（Production/Preview/Development）
- 重新部署项目以应用新的环境变量

### 4. 数据库连接超时

**问题**：`Error: Connection timeout`

**解决方案**：
- 检查 Neon 数据库是否处于活动状态（免费版会自动休眠）
- 确保 `DATABASE_URL` 包含 `?sslmode=require` 参数
- 增加 Serverless Function 的 `maxDuration` 设置

### 5. Clerk 认证失败

**问题**：无法登录或注册

**解决方案**：
- 确保 Clerk Dashboard 中配置了正确的回调 URL
- 检查 `CLERK_SECRET_KEY` 和 `VITE_CLERK_PUBLISHABLE_KEY` 是否正确
- 确认 Clerk 应用处于 Production 模式

## 自动部署

Vercel 会自动监听 GitHub 仓库的变化：

- **Push to `main` branch**: 自动部署到 Production
- **Push to other branches**: 自动创建 Preview 部署
- **Pull Request**: 自动创建 Preview 部署并在 PR 中显示链接

## 自定义域名

如果你想使用自定义域名：

1. 在 Vercel Dashboard 进入项目设置
2. 点击 **"Domains"**
3. 添加你的域名（如 `simpleweek.com`）
4. 按照 Vercel 的指引配置 DNS 记录
5. 等待 DNS 生效和 SSL 证书签发

## 监控和日志

- **实时日志**：Vercel Dashboard → 项目 → Deployments → 选择部署 → Logs
- **性能监控**：Vercel Dashboard → 项目 → Analytics
- **错误追踪**：可集成 Sentry 等第三方服务

## 成本估算

Vercel 免费计划包含：
- 100 GB 带宽/月
- 100 GB-小时 Serverless Function 执行时间/月
- 6000 分钟构建时间/月

对于个人项目和小型应用，免费计划通常足够使用。

## 下一步

部署成功后，你可以：

1. 配置自定义域名
2. 设置 CI/CD 工作流
3. 集成错误监控服务（如 Sentry）
4. 优化性能和 SEO
5. 添加更多功能

## 参考资源

- [Vercel 官方文档](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Neon 文档](https://neon.tech/docs)
- [Clerk 文档](https://clerk.com/docs)
- [Supabase 文档](https://supabase.com/docs)
