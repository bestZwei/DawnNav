import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider/theme-provider"
import { getDisplaySettings } from "@/lib/actions"
import { getCurrentWorkspace } from "@/lib/workspace"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import { htmlLang } from "@/lib/i18n"
import { AnimationSync } from "@/components/theme-provider/animation-sync"
import { getAdminSession } from "@/lib/api-auth"
import { AdminAuthProvider } from "@/components/auth/admin-auth-provider"
// 请求级缓存版解析：metadata/body/子布局/页面重复取用同一份工作区与展示设置
import { getCachedCurrentWorkspace, getCachedDisplaySettings } from "@/lib/workspace-render"

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  // 展示配置按当前请求的工作区覆盖（域名绑定 → 默认工作区）
  const settings = await getCachedDisplaySettings()
  const t = await getTranslations("metadata")

  return {
    title: settings?.siteName || "DawnNav",
    description: settings?.siteDescription || t("descriptionFallback"),
    icons: {
      icon: settings?.favicon || "/favicon.ico",
      apple: settings?.favicon || "/apple-touch-icon.png",
    },
  }
}

// 当前请求对应的工作区 slug，输出为 meta 标记；解析失败时无标记（探测侧按不可达处理）
async function WorkspaceMarker() {
  const workspace = await getCachedCurrentWorkspace()
  return <meta name="workspace" content={workspace.slug} />
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale()
  const settings = await getCachedDisplaySettings()
  const session = await getAdminSession()
  const initialIsAdmin = Boolean(session)

  return (
    <html lang={htmlLang(locale)} data-animations={settings?.enableAnimations !== false ? "true" : "false"} suppressHydrationWarning>
      <head>
        {/* 当前请求渲染的工作区标识（机器可读），供管理后台域名反向探测比对 */}
        <WorkspaceMarker />
      </head>
      <body className={inter.className}>
        {/* 资源提示：提前建立第三方连接，降低图标接口的首字节延迟（诗词接口 preconnect 随插件化移除）。
            管理员自定义代码（头部/尾部）已迁移至前台布局 app/(public)/layout.tsx，仅对导航页注入 */}
        <link rel="dns-prefetch" href="https://favicon.im" />
        <link rel="dns-prefetch" href="https://www.google.com" />
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AdminAuthProvider initialIsAdmin={initialIsAdmin}>
              {children}
              <SonnerToaster position="bottom-right" richColors />
              <AnimationSync />
            </AdminAuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
