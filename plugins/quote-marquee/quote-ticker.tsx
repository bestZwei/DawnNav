"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Quote } from "lucide-react"
import { useTranslations } from "next-intl"
import { useBuiltinPluginEnabled } from "@/lib/plugins/client"
import { cn } from "@/lib/utils"
import { PLUGIN_ID, MAX_DURATION_SECONDS, MIN_DURATION_SECONDS, STATIC_ROTATE_SECONDS, TICKER_SPEED_PXS } from "./constants"

// 语料条目：通用「两行一条」格式（正文 + 其他/出处），由 scripts/normalize-quotes.mjs 编译
interface QuoteEntry {
  text: string
  meta: string
}

// 顶栏下方名言跑马灯：一行内逐条从右向左滚动，一条走完接下一条，悬停暂停。
// 语料体积可观，动态 import 拆出主 bundle，仅在插件启用时加载；
// 加载前渲染空槽占位（槽位高度由外壳决定），避免内容区下移跳动。
// 全局动效总控（data-animations="false"）与 prefers-reduced-motion 会把 CSS 动画
// 压成瞬时完成、onAnimationEnd 连击推进，两种场景统一降级为静态定时轮换。
export function QuoteTicker() {
  const enabled = useBuiltinPluginEnabled(PLUGIN_ID)
  const t = useTranslations("quoteMarquee")
  const [entries, setEntries] = useState<QuoteEntry[] | null>(null)
  const [index, setIndex] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [motionAvailable, setMotionAvailable] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    import("./quotes.json").then((mod) => {
      if (cancelled) return
      const list = mod.default as QuoteEntry[]
      if (list.length > 0) {
        setEntries(list)
        // 随机起点：长语料每次进入页面从不同句子开始
        setIndex(Math.floor(Math.random() * list.length))
      }
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const killedByGlobalToggle =
      document.documentElement.getAttribute("data-animations") === "false"
    setMotionAvailable(!reduced && !killedByGlobalToggle)
  }, [])

  // 行程 = 视窗宽（keyframes 起点 translateX(100vw)）+ 文本宽，按恒定速度折算时长，
  // 超长语录封顶加速；量宽在挂载后进行，期间以 tailwind 默认 30s 兜底，误差不足一帧
  useEffect(() => {
    if (!entries || !motionAvailable) return
    const track = trackRef.current
    if (!track) return
    const travel = window.innerWidth + track.scrollWidth
    setDurationSeconds(
      Math.min(Math.max(travel / TICKER_SPEED_PXS, MIN_DURATION_SECONDS), MAX_DURATION_SECONDS)
    )
  }, [entries, index, motionAvailable])

  const handleAnimationEnd = useCallback(() => {
    setIndex((i) => (i + 1) % (entries?.length || 1))
  }, [entries])

  // 静态轮换兜底：动画不可用时定时换一条
  useEffect(() => {
    if (!entries || motionAvailable) return
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % entries.length),
      STATIC_ROTATE_SECONDS * 1000
    )
    return () => clearInterval(timer)
  }, [entries, motionAvailable])

  if (!enabled) return null
  const entry = entries?.[index % entries.length]

  return (
    <div
      data-plugin-banner=""
      className="sticky top-12 z-40 border-b bg-background/80 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-8 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <span className="z-10 flex shrink-0 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <Quote className="size-3" aria-hidden />
          {t("badge")}
        </span>
        <div
          ref={viewportRef}
          className="group relative h-full min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]"
        >
          {entry && (
            <div
              key={index}
              ref={motionAvailable ? trackRef : undefined}
              onAnimationEnd={motionAvailable ? handleAnimationEnd : undefined}
              className={cn(
                "absolute inset-y-0 flex items-center whitespace-nowrap",
                motionAvailable &&
                  "animate-marquee will-change-transform group-hover:[animation-play-state:paused]"
              )}
              style={durationSeconds > 0 ? { animationDuration: `${durationSeconds}s` } : undefined}
            >
              <span className="text-sm text-foreground/80">{entry.text}</span>
              {entry.meta && (
                <span className="ml-4 text-xs text-muted-foreground">{entry.meta}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
