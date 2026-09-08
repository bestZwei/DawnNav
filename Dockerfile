# Stage 1: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 版本信息（由 CI 通过 build-arg 注入，本地构建时回退为 dev）
ARG APP_VERSION=dev
ARG GIT_SHA=""
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}
ENV NEXT_PUBLIC_GIT_SHA=${GIT_SHA}

# 复制 package 文件和 Prisma schema
# scripts/ 必须在 npm ci 前就位：postinstall 钩子引用其中的 generate-prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY scripts ./scripts

# 安装所有依赖
RUN npm ci && \
    npm cache clean --force

# 复制剩余源代码
COPY . .

# 构建期数据库供给：静态预渲染页面需要可查询的数据库。
# 先建表并填充种子数据（产物仅存在于构建层，不进入 runner）
RUN SQLITE_PATH=/app/data/nav.db node scripts/db-sqlite.mjs && \
    SQLITE_PATH=/app/data/nav.db npx tsx prisma/seed.ts full

# 打包 runner 所需 node_modules 闭包（prisma CLI / tsx / bcryptjs 及其依赖树，
# 按 package.json 依赖关系 BFS 动态计算，避免静态白名单随 Prisma 升级漂移）
RUN node scripts/pack-runner-deps.mjs

# 构建
RUN npm run build


# Stage 2: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

# 运行时服务端通过 process.env 读取版本（与构建期内联值同源）
ARG APP_VERSION=dev
ARG GIT_SHA=""
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}
ENV NEXT_PUBLIC_GIT_SHA=${GIT_SHA}

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
# seed 脚本经 tsx 直接执行，依赖 lib/prisma.ts 源文件与 tsconfig 路径别名
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# 启动期脚本：超管补足（scripts/ensure-super-admin.mjs）由 entrypoint 调用
COPY --from=builder /app/scripts ./scripts

# 复制运行时依赖（数据库初始化和 seed 脚本需要；闭包由
# scripts/pack-runner-deps.mjs 在 builder 阶段动态计算打包）
COPY --from=builder /app/.runner-node-modules ./node_modules

# Prisma client（SQLite）与其 query engine 二进制
COPY --from=builder /app/generated ./generated

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制启动脚本
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh

# 会话密钥兜底文件目录（entrypoint.sh 未配置 SESSION_SECRET 时生成并持久化）：
# /app 属 root 而进程以 nextjs 运行，必须预建可写目录，否则重启重新生成密钥、全部会话失效
RUN mkdir -p /app/.session-data && chown -R nextjs:nodejs /app/.session-data
ENV SESSION_SECRET_FILE=/app/.session-data/.session-secret

# SQLite 数据目录：数据持久化位置，配合 compose 挂载 nav-data 卷
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
ENV SQLITE_PATH=/app/data/nav.db

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

# 执行启动脚本
CMD ["sh", "/app/entrypoint.sh"]
