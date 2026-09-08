"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"

// about-page 插件的前台 header 注入：顶栏右侧「关于」图标入口。
// 与页脚链接同受插件开关控制，未启用时不渲染
export function AboutHeaderSlot() {
  const t = useTranslations("about")
  const pathname = usePathname()
  const isActive = pathname === "/about"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 transition-transform active:scale-95 ${
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            asChild
          >
            <Link href="/about" aria-label={t("title")}>
              <Info className="h-4 w-4" />
              <span className="sr-only">{t("title")}</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{t("title")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
