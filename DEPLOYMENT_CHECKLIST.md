# Vercel 部署检查清单

使用此清单确保所有部署步骤都已完成。

## 准备阶段

- [ ] 已注册 GitHub 账号
- [ ] 已注册 Vercel 账号（使用 GitHub 登录）
- [ ] 已注册 Neon 账号并创建数据库
- [ ] 已注册 Clerk 账号并创建应用
- [ ] 已注册 Supabase 账号并创建项目
- [ ] 已创建 Supabase Storage 存储桶（名为 `images`，设置为公开）

## 环境变量准备

- [ ] 已获取 Neon `DATABASE_URL`
- [ ] 已获取 Clerk `CLERK_SECRET_KEY`
- [ ] 已获取 Clerk `VITE_CLERK_PUBLISHABLE_KEY`
- [ ] 已获取 Supabase `SUPABASE_URL`
- [ ] 已获取 Supabase `SUPABASE_SERVICE_ROLE_KEY`

## 代码推送

- [ ] 已将最新代码推送到 GitHub
- [ ] 确认以下文件已提交：
  - [ ] `vercel.json`
  - [ ] `api/server.js`
  - [ ] `.vercelignore`
  - [ ] 修改后的 `server/index.ts`

## Vercel 配置

- [ ] 已在 Vercel 导入 GitHub 仓库
- [ ] Framework Preset 选择为 "Other"
- [ ] 已添加所有环境变量：
  - [ ] `DATABASE_URL`
  - [ ] `CLERK_SECRET_KEY`
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NODE_ENV=production`
- [ ] 环境变量已应用于 Production、Preview 和 Development

## 部署

- [ ] 已点击 Deploy 按钮
- [ ] 构建成功（无错误）
- [ ] 已获取部署 URL

## 数据库初始化

- [ ] 已在本地或通过 Vercel CLI 执行 `pnpm db:push`
- [ ] 数据库表已成功创建

## Clerk 配置

- [ ] 已在 Clerk Dashboard 添加 Vercel 域名到允许列表
- [ ] 已添加 `https://your-app.vercel.app`
- [ ] 已添加 `https://*.vercel.app`（用于预览部署）

## 测试

- [ ] 访问部署 URL，页面正常加载
- [ ] 可以正常登录/注册
- [ ] 可以创建任务
- [ ] 可以编辑和删除任务
- [ ] 可以上传图片
- [ ] 数据刷新后仍然存在（持久化成功）
- [ ] 在不同设备上测试（手机、平板、电脑）

## 优化（可选）

- [ ] 配置自定义域名
- [ ] 设置 Vercel Analytics
- [ ] 集成错误监控（如 Sentry）
- [ ] 优化 SEO 设置
- [ ] 添加 favicon 和 meta 标签

## 完成

- [ ] 所有功能测试通过
- [ ] 已记录部署 URL
- [ ] 已通知团队成员

---

**部署 URL**: _____________________________________

**部署日期**: _____________________________________

**部署人员**: _____________________________________
