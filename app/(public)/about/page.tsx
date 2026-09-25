import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { SearchableLayout } from "@/components/layout/searchable-layout"
import { MarkdownContent } from "@/components/markdown-content"
import { getAllCategories, getAboutPage, getSites } from "@/lib/actions"
import { getCachedDisplaySettings } from "@/lib/workspace-render"
import { buildShareOpenGraph } from "@/lib/share-metadata"

// 语言解析依赖请求级 Cookie（i18n/request.ts），页面按请求动态渲染；
// 后台更新内容时由 revalidatePath("/about") 触发立即重新渲染

export async function generateMetadata(): Promise<Metadata> {
  const [about, t, settings] = await Promise.all([
    getAboutPage(),
    getTranslations("about"),
    getCachedDisplaySettings(),
  ])
  // 与页面 notFound() 分支保持一致：未启用/无内容时不输出页面级元数据
  if (!about.enabled || !about.content) return {}
  // 先剥 Markdown 链接/图片只留文本（否则 URL 会残留在描述里），再剥行内符号；
  // 全由符号组成的内容剥离后为空串，回退 undefined 交给搜索引擎自行摘要
  const plainDescription = about.content
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`>\[\]()-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160)
  return {
    // 标题只给页面名，根布局模板自动拼「关于 - 站点名」
    title: t("title"),
    description: plainDescription || undefined,
    openGraph: buildShareOpenGraph(settings, "/about"),
    alternates: { canonical: "/about" },
  }
}

export default async function AboutPage() {
  const [about, { data: allCategories }, { data: allSites }, t] = await Promise.all([
    getAboutPage(),
    getAllCategories(),
    getSites(),
    getTranslations("about"),
  ])

  // 未启用或无内容（且无全局默认内容）时不渲染空页面
  if (!about.enabled || !about.content) {
    notFound()
  }

  // 将所有网站扁平化，用于客户端搜索（与首页/分类页保持一致）
  const flatSites = allSites?.filter(site => site.isPublished) || []

  return (
    <SearchableLayout
      allCategories={allCategories || []}
      flatSites={flatSites}
      siteName={about.siteName}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground/95">
            {t("title")}
          </h1>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <MarkdownContent content={about.content} />
        </div>
      </div>
    </SearchableLayout>
  )
}
