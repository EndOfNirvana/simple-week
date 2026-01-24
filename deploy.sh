#!/bin/bash

# SimpleWeek Vercel 部署脚本
# 此脚本帮助你快速将代码推送到 GitHub 并触发 Vercel 部署

set -e

echo "================================"
echo "SimpleWeek Vercel 部署脚本"
echo "================================"
echo ""

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
  echo "✓ 检测到未提交的更改"
  
  # 显示更改的文件
  echo ""
  echo "更改的文件："
  git status -s
  echo ""
  
  # 添加所有更改
  echo "正在添加所有更改..."
  git add .
  
  # 提交更改
  read -p "请输入提交信息（默认：Update deployment configuration）: " commit_message
  commit_message=${commit_message:-"Update deployment configuration"}
  
  git commit -m "$commit_message"
  echo "✓ 已提交更改"
else
  echo "✓ 没有未提交的更改"
fi

echo ""

# 推送到 GitHub
echo "正在推送到 GitHub..."
current_branch=$(git branch --show-current)
git push origin "$current_branch"
echo "✓ 已推送到 GitHub ($current_branch 分支)"

echo ""
echo "================================"
echo "部署配置已推送到 GitHub！"
echo "================================"
echo ""
echo "下一步："
echo "1. 访问 https://vercel.com/dashboard"
echo "2. 点击 'Add New...' → 'Project'"
echo "3. 导入你的 GitHub 仓库"
echo "4. 配置环境变量（参考 VERCEL_DEPLOYMENT.md）"
echo "5. 点击 Deploy"
echo ""
echo "详细步骤请查看 VERCEL_DEPLOYMENT.md 文档"
echo ""
