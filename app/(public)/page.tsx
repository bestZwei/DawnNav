import { SearchableLayout } from "@/components/layout/searchable-layout"
import { SiteGrid } from "@/components/layout/site-grid"
import { CategoryIconBadge } from "@/components/category-icon"
import type { OverviewData } from "@/components/layout/overview-view"
import { getCategories } from "@/lib/actions"
import { getCachedDisplaySettings } from "@/lib/workspace-render"
import { getRequestBaseUrl } from "@/lib/site-url"
import { buildShareOpenGraph } from "@/lib/share-metadata"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"

// 语言解析依赖请求级 Cookie（i18n/request.ts），页面按请求动态渲染；
// 后台数据更新时由 revalidatePath("/") 触发立即重新渲染
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedDisplaySettings()
  return {
    // og:url 必须连同根布局的分享图等字段一起声明：Next 对 openGraph 是整段替换
    openGraph: buildShareOpenGraph(settings, "/"),
    alternates: { canonical: "/" },
  }
}
export default async function HomePage() {
  // 分类（含站点）与展示设置互不依赖，并行取数
  const [{ data: categories }, settings] = await Promise.all([
    getCategories(),
    getCachedDisplaySettings(),
  ])
  const [t, tMeta] = await Promise.all([
    getTranslations("home"),
    getTranslations("metadata"),
  ])

  // WebSite 结构化数据：帮助搜索引擎理解站点实体与站内搜索入口
  const siteName = settings?.siteName || "DawnNav"
  const siteDescription = settings?.siteDescription || tMeta("descriptionFallback")
  const baseUrl = await getRequestBaseUrl()
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description: siteDescription,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
  // 内联 script 里裸露的 < 会提前终止标签（如站点名含 </script>），统一转义
  const websiteJsonLdSafe = JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c")

  // 顶栏导航与全局搜索数据直接从分类结果投影，避免再发起两份近重复的全量加载
  const allCategories = (categories || []).map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
  }))
  const flatSites = (categories || []).flatMap(c => c.sites ?? [])

  // 图鉴视图数据：服务端渲染时就地投影给整页视图，避免运行时请求
  const overviewData: OverviewData = {
    siteName,
    siteDescription: settings?.siteDescription,
    footerCopyright: settings?.footerCopyright,
    categories: (categories || []).map((category) => ({
      id: category.id,
      name: category.name,
      sites: (category.sites || []).map((site) => ({
        id: site.id,
        name: site.name,
        url: site.url,
        iconUrl: site.iconUrl,
      })),
    })),
  }

    return (
      <SearchableLayout
        allCategories={allCategories || []}
        flatSites={flatSites}
        siteName={settings?.siteName}
        overviewData={overviewData}
      >
      <div className="space-y-4">
        {/* 首页顶栏是视觉品牌而非标题层级，这里补唯一的 h1 供搜索引擎与读屏器定位站点主题 */}
        <h1 className="sr-only">{siteName}</h1>
        {/* WebSite 结构化数据（含站内搜索入口） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLdSafe }}
        />
        {/* 分类内容 */}
        {categories && categories.length > 0 ? (
          <>
            {categories.map((category, index) => (
            <section key={category.id} id={`category-${category.slug}`} className="scroll-mt-[96px]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  {category.icon && (
                    <CategoryIconBadge icon={category.icon} size="md" />
                  )}
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/95">{category.name}</h2>
                  {category.sites && category.sites.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-medium h-5 rounded-full">
                      {category.sites.length}
                    </Badge>
                  )}
                </div>
              </div>

              {category.sites && category.sites.length > 0 ? (
                <SiteGrid sites={category.sites} categoryId={category.id} enableDrag />
              ) : (
                <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20">
                  <p className="text-xs text-muted-foreground">{t("noSitesInCategory")}</p>
                </div>
              )}

              {index < categories.length - 1 && <Separator className="mt-4 opacity-60" />}
            </section>
          ))}
          </>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-8">
            <p className="text-sm font-semibold text-foreground">{t("noCategoriesTitle")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noCategoriesDesc")}
            </p>
          </div>
        )}
      </div>
    </SearchableLayout>
  )
}

