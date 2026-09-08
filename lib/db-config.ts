// 数据库配置（SQLite 单一数据源，唯一事实源）。
// 数据文件路径由 SQLITE_PATH 指定，缺失时自动创建。
import path from "node:path"

export const DEFAULT_SQLITE_PATH = "./data/nav.db"

export interface DbConfig {
  /** Prisma datasource url：file:<绝对路径> */
  url: string
  /** 数据库文件绝对路径 */
  sqlitePath: string
}

export function resolveDbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  // 统一解析为绝对路径：Prisma CLI 对 file: 相对路径按 schema 所在目录解析，
  // client 运行时按 cwd 解析，两端基准不同会造成 CLI 与应用指向不同文件
  const sqlitePath = path.resolve(env.SQLITE_PATH?.trim() || DEFAULT_SQLITE_PATH)
  return { url: `file:${sqlitePath}`, sqlitePath }
}
