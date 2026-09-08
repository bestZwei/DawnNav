import { mkdirSync } from "node:fs"
import path from "node:path"
import { PrismaClient, Prisma } from "../generated/prisma"
import { resolveDbConfig, type DbConfig } from "./db-config"

// 数据库客户端统一入口（SQLite 单一数据源）。
// client 由 scripts/generate-prisma.mjs 按 prisma/schema.prisma 生成到 generated/prisma。

export type { DbConfig }
export { resolveDbConfig }
export type { PrismaClient }
// Prisma 输入类型命名空间统一出口（WhereInput / UpdateInput 等），
// 业务代码不得直接 import "@prisma/client"（默认 output 与本项目 client 结构无关）
export { Prisma }

/**
 * 大小写不敏感的 contains 过滤：SQLite 的 LIKE 天生 ASCII 大小写不敏感。
 * 保留统一出口，业务代码无需关心底层差异。
 */
export function ciContains(value: string): Prisma.StringFilter {
  return { contains: value }
}

// 工作区记录类型（供 workspace 兜底与后台列表使用）：
// 标量字段来自真实 client 生成类型，domains 关系保持可选（仅 include 查询时存在）
export type WorkspaceItem = Prisma.WorkspaceGetPayload<{}> & {
  domains?: Prisma.DomainGetPayload<{}>[]
}

export const dbConfig = resolveDbConfig()

function createPrisma(): PrismaClient {
  // SQLite：目录不存在时自动创建，数据库文件由引擎首次连接时创建。
  // 目录不可写时转译为带解决方案的报错，避免裸 ENOENT 让全站 500 且无从排查
  try {
    mkdirSync(path.dirname(dbConfig.sqlitePath), { recursive: true })
  } catch (error) {
    throw new Error(
      `[db] SQLite 数据目录不可写（${path.dirname(dbConfig.sqlitePath)}）。` +
        "解决方案：检查 SQLITE_PATH 指向目录的挂载与写权限" +
        "（Docker 部署请确认数据卷已正确挂载到 /app/data）。" +
        `原始错误：${error instanceof Error ? error.message : String(error)}`
    )
  }
  return new PrismaClient({
    datasources: { db: { url: dbConfig.url } },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 无条件复用全局单例：开发模式 HMR 与生产（standalone 长驻进程）都需要
// 保证同一进程内只有一个连接池，SQLite 场景下还避免了多实例写竞争
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrisma()
globalForPrisma.prisma = prisma
