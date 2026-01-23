# 环境变量配置指南

在 Vercel 部署时，需要配置以下环境变量：

## 必需的环境变量

### 数据库 (Neon PostgreSQL)
```
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```
从 Neon 控制台的 Connection Details 中获取。

### Clerk 认证
```
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```
- `CLERK_PUBLISHABLE_KEY` 和 `VITE_CLERK_PUBLISHABLE_KEY` 使用相同的值
- 从 Clerk 控制台的 API Keys 页面获取

### Cloudflare R2 存储
```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=simple-week-images
```
- `R2_ACCOUNT_ID`: 在 Cloudflare 控制台右侧边栏可以找到
- `R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`: 在 R2 > 管理 R2 API 令牌 中创建

## 可选的环境变量

### R2 公开访问 URL
```
R2_PUBLIC_URL=https://your-bucket.your-domain.com
```
如果您为 R2 存储桶配置了自定义域名，可以设置此变量。否则会使用签名 URL。

## 在 Vercel 中配置

1. 进入您的 Vercel 项目
2. 点击 Settings > Environment Variables
3. 添加上述所有环境变量
4. 点击 Save
5. 重新部署项目
