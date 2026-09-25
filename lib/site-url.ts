import { headers } from "next/headers"

// 从请求头推导站点根地址（反代场景读 x-forwarded-proto/host），
// 供 robots.ts / sitemap.ts / generateMetadata 的 metadataBase 与结构化数据共用
export async function getRequestBaseUrl(): Promise<string> {
  const fallback = process.env.NEXTAUTH_URL || "http://localhost:3000"
  try {
    const h = await headers()
    const host =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      h.get("x-workspace-host") ||
      h.get("host")
    if (!host) return fallback
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")
    return `${proto}://${host}`
  } catch {
    return fallback
  }
}
