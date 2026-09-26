"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, Megaphone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MarkdownContent } from "@/components/markdown-content"

// 前台公告弹窗：多条公告**依次排队**展示——每次只弹一条，关闭后自动展示下一条未读。
// 队列顺序取服务端返回顺序（按创建时间倒序，新的先弹）。
// 「已读」由本地标记实现——关闭后把公告 id 记入 localStorage 的已读集合，
// 同一条公告后续访问不再弹出；管理员发布新公告（新 id）会重新进入队列。
// 用集合（而非单个 id）保存已读：避免「最新公告下架后，更早看过的公告因标记
// 被覆盖而重复弹出」。换浏览器/无痕/清缓存会重新弹出，符合「同一访客只见一次」的预期。
// isSticky（常驻）公告例外：跳过已读记录，每次访问都重新弹出；本地仍记录已关闭
// 状态（state + 本次会话 ref，不写入 localStorage），用于本次访问内推进队列、
// 避免关闭后原地重弹；ref 同时保证 router.refresh() 重发 RSC payload 后不会重新入队。
const STORAGE_KEY = "dawnnav_announcement_dismissed"
// 已读集合上限：防止长期使用无限增长（50 条已远超实际公告数量）
const MAX_DISMISSED = 50
// 弹出/切换间隔：既避开首屏入场动画，也让上一条的关闭动画播完再展示下一条
const SHOW_DELAY_MS = 500
// 关闭动画结束（Radix 约 200ms）后再推进队列，避免弹窗内容原地跳变
const CLOSE_ADVANCE_MS = 300

export interface AnnouncementPayload {
  id: string
  title: string
  content: string
  linkUrl: string | null
  linkText: string | null
  // 常驻公告：每次访问都重新弹出（跳过 localStorage 已读记录）
  isSticky: boolean
}

// 读取已读集合。localStorage 不可用（隐私模式等）时返回空数组，本次照常弹出。
// 兼容旧版本存储的单个 id 字符串，升级后不会重弹已读公告。
function readDismissed(): string[] {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []
  } catch {
    // 非法 JSON：旧版本直接写入的单个 id 字符串，按单元素集合兼容
    return [raw]
  }
}

// 记录已读：读取/写入失败（隐私模式等）时静默跳过，仅影响下次是否再弹
function markDismissed(id: string) {
  try {
    const ids = Array.from(new Set([...readDismissed(), id])).slice(-MAX_DISMISSED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // 写入失败仅影响下次是否再弹，不影响本次关闭
  }
}

export function AnnouncementDialog({
  announcements,
}: {
  announcements: AnnouncementPayload[]
}) {
  const t = useTranslations("announcement")
  // 本地已读集合：SSR 阶段读不到 localStorage，故初始为空、挂载后再同步
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  // 本次页面加载内已关闭的公告。常驻公告不落 localStorage，只靠 state 记不住：
  // router.refresh() 会重发 RSC payload 换掉 announcements 引用，下面的 effect
  // 随即重算 dismissed，刚关掉的常驻公告会被重新入队
  const sessionDismissedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const stored = new Set(readDismissed())
    // 常驻公告不受历史已读记录影响：此前按普通公告发布、后被改为常驻的，
    // 也要从本次访问开始重新弹出
    for (const item of announcements) {
      if (item.isSticky) stored.delete(item.id)
    }
    // 本次访问已关闭的最后叠加：优先于上面的历史推导（隐私模式下 localStorage
    // 写不进去时，普通公告同样靠这里保持已关闭）
    for (const id of sessionDismissedRef.current) stored.add(id)
    setDismissed(stored)
  }, [announcements])

  // 队列取「第一条未读」：服务端已按创建时间倒序，关闭当前这条后自动顺延到下一条。
  // 常驻公告不在 localStorage 里留已读记录（见 dismiss），天然每次访问都重新入队
  const current = announcements.find((item) => !dismissed.has(item.id)) ?? null
  const currentId = current?.id

  useEffect(() => {
    if (!currentId) return
    // 延后弹出：避免与首屏内容与入场动画抢焦点；切换下一条时同样留出间隔
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [currentId])

  if (!current) return null

  const dismiss = () => {
    const id = current.id
    // 常驻公告不写已读记录（下次访问仍会弹出）；本地仍要标记，用于推进队列
    if (!current.isSticky) markDismissed(id)
    // 同步记入本次会话（早于下面的动画延时）：即便随后 router.refresh() 重算
    // dismissed，也不会把这条重新入队
    sessionDismissedRef.current.add(id)
    setOpen(false)
    // 等关闭动画播完再推进队列：保证每条（含最后一条）都能看到关闭动效
    setTimeout(() => setDismissed((prev) => new Set(prev).add(id)), CLOSE_ADVANCE_MS)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {current.title}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("ariaLabel")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <MarkdownContent content={current.content} />
        </div>

        <DialogFooter className="sm:justify-between">
          {current.linkUrl ? (
            <Button variant="link" className="px-0" asChild>
              <a href={current.linkUrl} target="_blank" rel="noopener noreferrer">
                {current.linkText?.trim() || t("learnMore")}
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={dismiss}>{t("gotIt")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
