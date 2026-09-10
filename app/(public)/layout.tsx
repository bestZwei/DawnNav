import { getCachedDisplaySettings } from "@/lib/workspace-render"
import { ClientPluginsProvider } from "@/lib/plugins/client"
import { getClientPluginsView } from "@/lib/plugins/server"
import { getActiveAnnouncement } from "@/lib/actions"
import { AnnouncementDialog } from "@/components/announcement-dialog"

// 前台公共布局：管理员自定义代码仅注入前台导航页（首页/分类/搜索/关于），
// 管理后台不注入——统计与挂件脚本只需要对访客生效，混入后台页面对账时易污染数据。
export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 自定义代码注入依赖展示配置（工作区覆盖后的最终值）
  const settings = await getCachedDisplaySettings()
  const initialPlugins = await getClientPluginsView()
  // 公告：取当前生效的最新一条，未发布/过期时为 null（组件不渲染）
  const announcement = await getActiveAnnouncement()

  return (
    <ClientPluginsProvider initialPlugins={initialPlugins}>
      {/* 管理员自定义代码（头部）：SSR 直出，页面加载早期执行（统计/验证脚本/自定义样式）。
          容器无视觉样式；script 经 HTML 解析执行，style/meta 等标签同样按文档流生效。
          suppressHydrationWarning：浏览器会把 style 属性等经 CSSOM 规范化（如冒号后补空格），
          读回的 innerHTML 与注入源串不一致，React 19 的水合属性对比会误报 mismatch */}
      {settings?.customHeadCode && (
        <div
          style={{ display: "none" }}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: settings.customHeadCode }}
        />
      )}
      {children}
      {/* 公告弹窗：延迟展示，同一条公告每个访客仅弹一次 */}
      <AnnouncementDialog announcement={announcement} />
      {/* 管理员自定义代码（尾部）：SSR 直出于前台内容结尾，适合页面特效、
          第三方挂件、客服代码等不影响首屏的自定义内容；容器保持可见，
          静态标签（iframe/挂件 DOM）可直接渲染；suppressHydrationWarning 同上 */}
      {settings?.customBodyCode && (
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: settings.customBodyCode }}
        />
      )}
    </ClientPluginsProvider>
  )
}
