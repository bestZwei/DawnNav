import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Skeleton - 匹配真实 Header 结构（h-12，见 components/layout/header.tsx） */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex h-12 items-center">
            <div className="flex-shrink-0 pr-6 sm:pr-8">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-32 hidden sm:block" />
              </div>
            </div>

            {/* 分类导航骨架 */}
            <div className="hidden md:flex flex-1 items-center space-x-6 text-sm font-medium">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>

            {/* 搜索框骨架 */}
            <div className="flex-shrink-0 pl-2 sm:pl-4 flex items-center gap-2">
              <Skeleton className="h-9 w-48 hidden sm:block" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton - 匹配真实页面结构（容器宽度、卡片行高 76px、间距与列数
          全部对齐 site-grid.tsx 标准密度，避免加载结束的布局跳变） */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 pt-4">
        <div className="mx-auto max-w-[1600px] w-full lg:pl-2">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <section key={i} className="space-y-6">
                {/* 分类标题骨架 */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>

                {/* 网站卡片骨架：行高/间距/列数与 site-grid 标准密度一致 */}
                <div className="grid auto-rows-[76px] grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {[...Array(10)].map((_, j) => (
                    <div key={j} className="h-full rounded-lg border bg-muted/20" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
