#!/usr/bin/env node
// Prisma client 生成入口（postinstall / CI / Docker 构建调用）：
// 从 prisma/schema.prisma 生成 SQLite client 到 generated/ 目录。
import { execSync } from 'node:child_process'

execSync('npx prisma generate', { stdio: 'inherit', env: process.env })

console.log('[generate-prisma] client 生成完成：generated/prisma')
