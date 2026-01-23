# 简周 (SimpleWeek)

一个简单高效的周计划管理工具，帮助您规划每周的工作和生活。

## 功能特性

- 📅 **周视图**：清晰展示一周七天，每天分为上午、下午、晚上三个时间块
- ✅ **任务管理**：添加、编辑、删除和标记完成任务
- 🔄 **拖拽排序**：支持在不同时间块之间拖拽移动任务
- 📝 **备注栏**：每周独立的备注区域
- 🎨 **自定义内容**：可添加文字或图片个性化每周界面
- 📱 **响应式设计**：完美支持手机和电脑端
- 🔐 **用户认证**：支持多用户，数据隔离
- ☁️ **云端同步**：数据保存在云端，多设备同步

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 4
- **后端**：Express + tRPC
- **数据库**：PostgreSQL (Neon)
- **认证**：Clerk
- **存储**：Supabase Storage
- **部署**：Vercel

## 部署指南

### 1. 准备工作

确保您已经注册以下服务的账号：
- [GitHub](https://github.com)
- [Vercel](https://vercel.com) - 用 GitHub 登录
- [Neon](https://neon.tech) - 免费 PostgreSQL 数据库
- [Clerk](https://clerk.com) - 用户认证服务
- [Supabase](https://supabase.com) - 图片存储

### 2. 配置 Neon 数据库

1. 登录 Neon 控制台
2. 创建新项目，选择离您最近的区域
3. 复制 Connection string（连接字符串）

### 3. 配置 Clerk 认证

1. 登录 Clerk 控制台
2. 创建新应用
3. 选择登录方式（推荐：Google、Email、Username）
4. 复制 Publishable key 和 Secret key

### 4. 配置 Supabase 存储

1. 登录 Supabase 控制台
2. 创建新项目
3. 进入 Storage，创建名为 `images` 的**公开**存储桶
4. 进入 Project Settings > API，复制：
   - Project URL
   - service_role key（点击 Reveal 显示）

### 5. 部署到 Vercel

1. Fork 或导入此仓库到您的 GitHub
2. 登录 Vercel，点击 "New Project"
3. 选择您的 GitHub 仓库
4. 在 Environment Variables 中添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | Neon 连接字符串 |
| `CLERK_SECRET_KEY` | Clerk Secret key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |

5. 点击 Deploy

### 6. 初始化数据库

部署完成后，需要初始化数据库表：

```bash
# 克隆仓库到本地
git clone https://github.com/YOUR_USERNAME/simple-week.git
cd simple-week

# 安装依赖
pnpm install

# 设置环境变量（创建 .env 文件）
cp .env.example .env
# 编辑 .env 文件，填入您的配置

# 推送数据库 schema
pnpm db:push
```

## 本地开发

```bash
# 安装依赖
pnpm install

# 创建 .env 文件并填入环境变量
cp .env.example .env
# 编辑 .env 文件

# 推送数据库 schema
pnpm db:push

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173（前端）和 http://localhost:3001（后端）

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL 连接字符串 |
| `CLERK_SECRET_KEY` | ✅ | Clerk 后端密钥 |
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk 前端公钥 |
| `SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 服务端密钥 |
| `PORT` | ❌ | 服务器端口，默认 3001 |

## 许可证

MIT
