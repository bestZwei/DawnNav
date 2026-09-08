#!/bin/sh
set -e

# 会话签名密钥兜底：未显式配置时生成并持久化到 SESSION_SECRET_FILE（Dockerfile 预建的
# nextjs 可写目录 /app/.session-data/.session-secret，可在 compose 挂卷持久化），
# 保证容器重启后会话不全部失效（镜像重建时会重新生成，届时需重新登录）
if [ -z "$SESSION_SECRET" ] && [ -z "$NEXTAUTH_SECRET" ]; then
  SECRET_FILE="${SESSION_SECRET_FILE:-/app/.session-secret}"
  if [ -f "$SECRET_FILE" ]; then
    export SESSION_SECRET="$(cat "$SECRET_FILE")"
    echo "⚠️  使用容器内持久化的会话密钥（建议在环境变量中显式配置 SESSION_SECRET）"
  else
    export SESSION_SECRET="$(head -c 32 /dev/urandom | base64)"
    if echo "$SESSION_SECRET" > "$SECRET_FILE" 2>/dev/null; then
      chmod 600 "$SECRET_FILE" 2>/dev/null || true
    else
      # 写入失败（文件系统只读/无权限）：本次运行的会话重启后失效，显式提示避免静默掉线
      echo "❌ 警告：无法持久化会话密钥（$SECRET_FILE 不可写），容器重启后需重新登录。请配置 SESSION_SECRET 环境变量或挂载可写卷。"
    fi
    echo "⚠️  未配置 SESSION_SECRET，已自动生成会话密钥（建议在环境变量中显式配置并持久化）"
  fi
fi

# seed 前置检查：无任何管理员账户时才执行种子初始化
seed_if_needed() {
  echo "🔍 检查数据库是否已初始化..."
  # 必须同时覆盖 SUPER_ADMIN 与 ADMIN：引入两级角色后，存量账号被提升为超管
  # 是大概率操作，若这里只查 ADMIN，会误判为「未初始化」而重跑 seed（往已有
  # 数据的库里注入示例分类与站点）
  if node -e "
    const { PrismaClient } = require('./generated/prisma');
    const prisma = new PrismaClient();
    prisma.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } })
      .then(user => {
        if (user) {
          console.log('✅ 数据库已初始化，跳过 seed');
          process.exit(0);
        } else {
          console.log('🌱 数据库未初始化，开始 seed...');
          process.exit(1);
        }
      })
      .catch(() => process.exit(1));
  "; then
    echo "✅ 跳过 seed"
  else
    echo "🌱 执行 seed 脚本（完整示例数据）..."
    npx tsx prisma/seed.ts full
  fi
}

# ===== SQLite（唯一数据源） =====
SQLITE_PATH="${SQLITE_PATH:-/app/data/nav.db}"
export SQLITE_PATH
export SQLITE_URL="file:${SQLITE_PATH}"
SQLITE_DIR="$(dirname "$SQLITE_PATH")"
mkdir -p "$SQLITE_DIR" 2>/dev/null || true
if [ ! -w "$SQLITE_DIR" ]; then
  echo "❌ SQLite 目录不可写：$SQLITE_DIR（请挂载可写卷或调整权限）"
  exit 1
fi

echo "🗄️  数据库：SQLite（$SQLITE_PATH）"

# 幂等建表：--accept-data-loss 仅在首次空库建表加唯一约束时跳过确认，对已同步库无操作
node scripts/db-sqlite.mjs

seed_if_needed

# 升级补足：多管理员版本上线后，存量部署的账号全部仍是 ADMIN，
# 系统内没有超管（用户管理/审计日志不可用）。此处提升最早的管理员为超管。
# 失败不阻断启动——可事后按 docs/admin-permissions 的说明用 SQL 手动提升
node scripts/ensure-super-admin.mjs ||
  echo "⚠️  超管补足检查未成功执行（不影响启动），必要时请按文档手动提升超管"

# 初始账号对齐：ADMIN_EMAIL/ADMIN_PASSWORD 仅首次初始化时由 seed 读取，
# 部署方事后才设置时库里没有对应账号（按环境变量登录会 401 且难自查）。
# 此处确保该账号存在（已存在则不覆盖密码）。失败不阻断启动
node scripts/ensure-env-admin.mjs ||
  echo "⚠️  初始账号对齐检查未成功执行（不影响启动）"

echo "🚀 启动应用..."
# --max-http-header-size：测活探测需要，避免 Google 等站点响应头超 undici 16KB 上限导致误判失效
exec node --max-http-header-size=65536 server.js
