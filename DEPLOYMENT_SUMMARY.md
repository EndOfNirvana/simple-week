# Vercel 部署配置总结

本文档总结了为 SimpleWeek 项目添加的 Vercel 部署配置。

## 新增和修改的文件

### 1. `vercel.json`（修改）

配置 Vercel 构建和部署行为：

- 指定构建命令：`pnpm build`
- 设置输出目录：`dist/client`（前端静态文件）
- 配置路由重写：将 `/api/trpc/*` 请求转发到 Serverless Function
- 配置 Serverless Function 运行时：Node.js 20.x

**关键配置：**
```json
{
  "outputDirectory": "dist/client",
  "rewrites": [
    {
      "source": "/api/trpc/:path*",
      "destination": "/api/server"
    }
  ]
}
```

### 2. `api/server.js`（新增）

Vercel Serverless Function 入口文件，导出构建后的 Express 应用。

**作用：**
- 作为 Vercel Serverless Function 的入口点
- 导入并导出构建后的 Express app（`dist/index.js`）
- 处理所有 `/api/trpc/*` 的 API 请求

### 3. `server/index.ts`（修改）

修改服务器入口文件以支持 Serverless 部署：

**主要变化：**
- 导出 Express app：`export default app;`
- 条件启动服务器：只在非 Vercel 环境中启动 HTTP 服务器
- 修改静态文件路径：从 `dist/client` 改为 `client`（因为 Vercel 会自动处理静态文件）

**关键代码：**
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

### 4. `.vercelignore`（新增）

排除不需要上传到 Vercel 的文件，减少部署包大小和加快部署速度。

**排除的内容：**
- 源代码目录（`client/src`, `server`, `shared`）
- 配置文件（`tsconfig.json`, `vite.config.ts` 等）
- 文档文件（`*.md`）
- 开发工具配置

### 5. 文档文件（新增）

- `VERCEL_DEPLOYMENT.md`：详细的部署指南和故障排除
- `DEPLOYMENT_CHECKLIST.md`：部署检查清单
- `QUICK_START.md`：快速开始指南
- `deploy.sh`：一键部署脚本
- `DEPLOYMENT_SUMMARY.md`：本文档

## 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌───────────────────┐    │
│  │   Static Files   │         │  Serverless Func  │    │
│  │   (CDN)          │         │  (Node.js 20.x)   │    │
│  │                  │         │                   │    │
│  │  dist/client/    │         │  api/server.js    │    │
│  │  - index.html    │         │  └─> dist/index.js│    │
│  │  - assets/       │         │                   │    │
│  │  - ...           │         │  /api/trpc/*      │    │
│  └──────────────────┘         └───────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
           │                              │
           │                              │
           ▼                              ▼
    ┌──────────┐                  ┌──────────────┐
    │  Browser │                  │  External    │
    │          │                  │  Services    │
    └──────────┘                  │  - Neon DB   │
                                  │  - Clerk     │
                                  │  - Supabase  │
                                  └──────────────┘
```

## 工作流程

### 构建阶段

1. Vercel 执行 `pnpm install` 安装依赖
2. 执行 `pnpm build`：
   - Vite 构建前端 → `dist/client/`
   - esbuild 构建后端 → `dist/index.js`
3. Vercel 收集静态文件（`dist/client/`）
4. Vercel 准备 Serverless Function（`api/server.js`）

### 运行时

**静态文件请求**（如 `/`, `/assets/main.js`）：
- 直接从 Vercel CDN 提供
- 快速、全球分发

**API 请求**（如 `/api/trpc/tasks.list`）：
- 路由到 Serverless Function（`api/server.js`）
- Function 导入并执行 Express app（`dist/index.js`）
- Express app 处理 tRPC 请求
- 连接外部服务（Neon、Clerk、Supabase）
- 返回响应

## 环境变量

部署需要以下环境变量：

| 变量名 | 用途 | 来源 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接 | Neon |
| `CLERK_SECRET_KEY` | 后端认证 | Clerk |
| `VITE_CLERK_PUBLISHABLE_KEY` | 前端认证 | Clerk |
| `SUPABASE_URL` | 存储服务 | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | 存储服务密钥 | Supabase |
| `NODE_ENV` | 环境标识 | 手动设置为 `production` |
| `VERCEL` | Vercel 环境标识 | Vercel 自动设置 |

## 与传统部署的区别

### 传统 VPS/服务器部署

- 需要一个持续运行的 Node.js 进程
- Express app 监听特定端口（如 3000）
- 静态文件由 Express 提供或使用 Nginx
- 需要手动管理服务器、负载均衡、SSL 证书等

### Vercel Serverless 部署

- 后端按需运行（Serverless Function）
- 静态文件由全球 CDN 提供
- 自动扩展、自动 SSL、自动负载均衡
- 无需管理服务器基础设施

## 优势

1. **零配置基础设施**：无需配置服务器、负载均衡器、SSL 证书
2. **自动扩展**：根据流量自动扩展，无需手动配置
3. **全球 CDN**：静态文件在全球边缘节点缓存，加载速度快
4. **持续部署**：推送到 GitHub 自动触发部署
5. **预览部署**：每个 PR 自动创建预览环境
6. **成本效益**：免费计划对个人项目足够，按使用付费

## 限制

1. **Serverless Function 限制**：
   - 执行时间限制（免费版 10 秒）
   - 内存限制（1024 MB）
   - 冷启动延迟（首次请求可能较慢）

2. **不适合的场景**：
   - 长时间运行的任务（如视频处理）
   - WebSocket 长连接
   - 大文件上传/下载

3. **数据库连接**：
   - 每个请求可能创建新的数据库连接
   - 需要使用连接池或 Serverless-friendly 数据库（如 Neon）

## 最佳实践

1. **使用 Serverless-friendly 服务**：
   - 数据库：Neon、PlanetScale、Supabase
   - 认证：Clerk、Auth0、NextAuth
   - 存储：Supabase Storage、Cloudinary、S3

2. **优化冷启动**：
   - 减少依赖包大小
   - 使用 esbuild 打包后端代码
   - 避免在模块顶层执行耗时操作

3. **数据库连接管理**：
   - 使用连接池
   - 设置合理的连接超时
   - 考虑使用 HTTP-based 数据库客户端

4. **监控和日志**：
   - 使用 Vercel Analytics 监控性能
   - 集成错误追踪服务（如 Sentry）
   - 定期检查 Vercel 日志

## 故障排除

### 构建失败

- 检查 `package.json` 中的依赖
- 查看 Vercel 构建日志
- 确保 `pnpm-lock.yaml` 已提交

### API 请求失败

- 检查 `vercel.json` 中的 `rewrites` 配置
- 确认 `api/server.js` 正确导出 Express app
- 查看 Serverless Function 日志

### 环境变量问题

- 在 Vercel Dashboard 确认环境变量已设置
- 确保变量应用于正确的环境
- 重新部署以应用新的环境变量

## 下一步

部署成功后，可以考虑：

1. 配置自定义域名
2. 启用 Vercel Analytics
3. 集成 Sentry 错误监控
4. 优化构建和运行时性能
5. 设置 CI/CD 工作流
6. 添加端到端测试

## 参考资源

- [Vercel 文档](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Express.js 文档](https://expressjs.com/)
- [tRPC 文档](https://trpc.io/)
