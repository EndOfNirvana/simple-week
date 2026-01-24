# 简周 (SimpleWeek)

一个极简、高效、高度可定制的周计划管理工具，帮助您掌控每周的工作与生活。

**在线访问**: [https://simple-week.vercel.app](https://simple-week.vercel.app)

![SimpleWeek 截图](https://raw.githubusercontent.com/EndOfNirvana/simple-week/master/screenshot.png)

## 核心功能

- **📅 周视图**: 清晰展示一周七天，每天分为上午、下午、晚上三个时间块，支持响应式布局。
- **✅ 任务管理**: 轻松添加、编辑、删除和标记完成任务。
- **🔄 拖拽排序**: 在不同时间块之间拖拽移动任务，灵活安排日程。
- **📝 备注栏**: 每周独立的备注区域，记录灵感和想法。
- **🎨 自定义内容**: 在周视图顶部添加文字或图片，打造个性化界面。
- **🖼️ 图片导出**: 一键将当前周计划导出为图片，方便分享和打印。
- **🚀 快速导航**: 通过年度周选择器，快速跳转到任意一周。
- **🔐 用户认证**: 基于 Clerk 的安全用户认证，支持多用户数据隔离。
- **☁️ 云端同步**: 所有数据实时保存在云端，多设备无缝同步。

## 技术栈

- **前端**: React 19, TypeScript, Tailwind CSS 4, Vite
- **后端**: Express, tRPC
- **数据库**: PostgreSQL (Neon)
- **认证**: Clerk
- **存储**: Supabase Storage
- **部署**: Vercel

## 部署指南

### 1. 准备工作

确保您已经注册以下服务的账号：
- [GitHub](https://github.com)
- [Vercel](https://vercel.com) (使用 GitHub 登录)
- [Neon](https://neon.tech) (免费 PostgreSQL 数据库)
- [Clerk](https://clerk.com) (用户认证服务)
- [Supabase](https://supabase.com) (图片存储)

### 2. 配置服务

1. **Neon**: 创建新项目，复制 Connection string。
2. **Clerk**: 创建新应用，复制 Publishable key 和 Secret key。
3. **Supabase**: 创建新项目，创建名为 `images` 的**公开**存储桶，并复制 Project URL 和 service_role key。

### 3. 部署到 Vercel

1. Fork 或导入此仓库到您的 GitHub。
2. 在 Vercel 中创建新项目，选择您的 GitHub 仓库。
3. 在 Environment Variables 中添加以下变量：

| 变量名 | 值 |
|---|---|
| `DATABASE_URL` | Neon 连接字符串 |
| `CLERK_SECRET_KEY` | Clerk Secret key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |

4. 点击 Deploy。

### 4. 初始化数据库

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

# 推送数据库 schema
pnpm db:push

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173

## 许可证

MIT
