import { Skeleton } from "@/components/ui/skeleton"

// 仅内容区骨架：侧边栏/顶栏由 (dash)/layout 的 AdminLayout 稳定挂载，
// 导航时不参与骨架替换，消除整页闪烁感。
// 卡片数量/高度对齐 dashboard 页自身骨架（8 张 h-[120px] + 2 张 h-[300px]），
// 避免导航到仪表盘时「路由骨架 → 页面骨架 → 内容」两段 reflow 跳变
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-56 rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  )
}
