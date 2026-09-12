/**
 * 获取当前应用版本。
 *
 * 版本在镜像构建时通过 build-arg 注入：
 * - 客户端 bundle 中此表达式被构建期内联替换
 * - 服务端运行时读取容器 ENV
 * 本地开发或变量缺失时回退为 "dev"
 */
export function getAppVersion(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION?.trim()
  return version || "dev"
}

export function getGitSha(): string {
  return process.env.NEXT_PUBLIC_GIT_SHA?.trim() || ""
}

export function isDevVersion(version: string = getAppVersion()): boolean {
  return version === "dev" || parseSemver(version) === null
}

/**
 * 宽松解析语义化版本号。
 * 支持 vX.Y.Z / X.Y.Z / vX.Y.Z-rc1，忽略预发布后缀。
 * 无法解析时返回 null。
 */
function parseSemver(version: string): [number, number, number] | null {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  const major = Number.parseInt(match[1], 10)
  const minor = Number.parseInt(match[2], 10)
  const patch = Number.parseInt(match[3], 10)
  if (
    !Number.isFinite(major) ||
    !Number.isFinite(minor) ||
    !Number.isFinite(patch)
  ) {
    return null
  }
  return [major, minor, patch]
}
