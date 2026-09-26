import type { ClientPluginView } from "./plugins/types"

export interface PublicSettings {
  siteName: string
  siteDescription: string
  siteLogo: string | null
  favicon: string | null
  pageSize: number
  showFooter: boolean
  footerCopyright: string
  footerLinks: Array<{ name: string; url: string }>
  showAdminLink: boolean
  showIcp: boolean
  icpNumber: string | null
  icpLink: string | null
  githubUrl: string | null
  defaultLanguage: string
  // 页面动效总开关
  enableAnimations?: boolean
  // 插件系统：前台注入点消费的精简视图
  plugins: ClientPluginView
}

export const defaultSettings: PublicSettings = {
  siteName: "DawnNav",
  siteDescription: "简洁现代化的网址导航系统",
  siteLogo: null,
  favicon: null,
  pageSize: 20,
  showFooter: true,
  footerCopyright: `© ${new Date().getFullYear()} DawnNav. All rights reserved.`,
  footerLinks: [{ name: "GitHub", url: "https://github.com/bestZwei/DawnNav" }],
  showAdminLink: true,
  showIcp: false,
  icpNumber: null,
  icpLink: null,
  githubUrl: "https://github.com/bestZwei/DawnNav",
  defaultLanguage: "zh",
  enableAnimations: true,
  plugins: { builtinEnabledIds: [], uploaded: [] },
}

let cachedSettings: PublicSettings | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
// 并发去重：缓存过期瞬间多个消费方同时调用只发一次请求
// （首页几十个常挂载弹窗同时初始化时曾实测打出 10 个重复请求）
let inflight: Promise<PublicSettings> | null = null
// 代数计数：invalidate 时已在飞行中的请求 resolve 后不得再写回缓存，
// 否则旧响应会把刚失效的缓存刷成脏数据并续期 5 分钟
let generation = 0

// 使客户端设置缓存失效：插件启停/上传/删除等会改变 plugins 视图的操作
// 必须调用，否则各消费方（注入点、来源列、详情编辑区等）最长 5 分钟内读到旧状态
export function invalidateSettingsCache() {
  generation++
  cachedSettings = null
  cacheTimestamp = 0
  inflight = null
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const now = Date.now()
  if (cachedSettings && now - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings
  }
  if (inflight) {
    return inflight
  }

  const gen = generation
  const request = (async () => {
    try {
      const res = await fetch("/api/settings", {
        cache: "no-cache",
        headers: { Accept: "application/json" },
      })

      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === "object" && !data.error) {
          const merged: PublicSettings = { ...defaultSettings, ...data }
          if (gen === generation) {
            cachedSettings = merged
            cacheTimestamp = Date.now()
          }
          return merged
        }
      }
    } catch {
      // Gracefully fallback on network or parse error without throwing
    }

    return cachedSettings || defaultSettings
  })()
  request.finally(() => {
    // 仅当仍指向自己这轮请求时才清引用：中途 invalidate 后其他调用者
    // 可能已发起新一轮请求，不能替它清掉（否则第三个调用者无法合流）
    if (inflight === request) {
      inflight = null
    }
  })
  inflight = request
  return request
}
