import type { Metadata } from "next"

// 页面一旦声明 openGraph，Next 会把父布局解析好的 openGraph 整段替换掉（不是深浅合并，
// 见 next/dist/lib/metadata/resolve-metadata.js 的 mergeMetadata）：og:type / siteName /
// images 会一并丢失。凡是要给页面单独设 og:url 的地方，必须用本模块把整套字段带齐。

type ShareSettings = { siteName?: string | null; siteLogo?: string | null } | null | undefined

// 分享图仅接受可被爬虫解析的地址：http(s) 绝对地址，或能按 metadataBase 解析的站内路径。
// siteLogo 允许存量 data URL（数十 KB base64），既不是合法 og:image 也会撑大 HTML
export function resolveShareImage(logo: string | null | undefined): string | undefined {
  return logo && /^(https?:\/\/|\/)/.test(logo) ? logo : undefined
}

// 根布局与页面共用：og:title/og:description 不在此写死，缺省时 Next 会用页面级
// title/description 回填，社交平台也会回退 <title> 与 meta description
export function buildShareOpenGraph(settings: ShareSettings, url?: string): Metadata["openGraph"] {
  const siteName = settings?.siteName || "DawnNav"
  const shareImage = resolveShareImage(settings?.siteLogo)
  return {
    type: "website",
    siteName,
    ...(url ? { url } : {}),
    ...(shareImage ? { images: [{ url: shareImage, alt: siteName }] } : {}),
  }
}
