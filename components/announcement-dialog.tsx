"use client"

import { useEffect, useState } from "react"
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

// 前台公告弹窗：「只显示一次」由本地标记实现——关闭后把公告 id 写入
// localStorage，同一条公告后续访问不再弹出；管理员发布新公告后 id 变化，会再弹一次。
// 换浏览器/无痕/清缓存会重新弹出，符合「同一访客只见一次」的预期。
const STORAGE_KEY = "dawnnav_announcement_dismissed"

export interface AnnouncementPayload {
  id: string
  title: string
  content: string
  linkUrl: string | null
  linkText: string | null
}

export function AnnouncementDialog({
  announcement,
}: {
  announcement: AnnouncementPayload | null
}) {
  const t = useTranslations("announcement")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!announcement) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === announcement.id) return
    } catch {
      // localStorage 不可用（隐私模式等）：本次照常弹出，仅不记录
    }
    // 延后弹出：避免与首屏内容与入场动画抢焦点
    const timer = setTimeout(() => setOpen(true), 500)
    return () => clearTimeout(timer)
  }, [announcement])

  if (!announcement) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, announcement.id)
    } catch {
      // 写入失败仅影响下次是否再弹，不影响本次关闭
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {announcement.title}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("ariaLabel")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <MarkdownContent content={announcement.content} />
        </div>

        <DialogFooter className="sm:justify-between">
          {announcement.linkUrl ? (
            <Button variant="link" className="px-0" asChild>
              <a href={announcement.linkUrl} target="_blank" rel="noopener noreferrer">
                {announcement.linkText?.trim() || t("learnMore")}
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
