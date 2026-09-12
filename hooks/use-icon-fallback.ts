"use client"

import { useEffect, useState } from "react"

/**
 * 图标直链加载失败的代理回退。
 *
 * 图标先按原始地址（浏览器直连，命中浏览器缓存零服务端开销）加载；
 * 失败（CORP 拦截、混合内容升级失败、网络不通等）时切换到 /api/icon
 * 的 siteId 代理模式由服务端拉取。回退是单向的：代理也失败时返回
 * false，由调用方决定最终失败态（首字母占位等）。
 */
export function useIconFallback(iconSrc: string | null, fallbackSrc: string | null) {
  const [usingFallback, setUsingFallback] = useState(false)

  // 原始地址变化（切换图标服务/编辑站点）时重置回退状态
  useEffect(() => {
    setUsingFallback(false)
  }, [iconSrc])

  const src = usingFallback && fallbackSrc ? fallbackSrc : iconSrc

  /** 图片 onError 时调用：返回 true 表示已切换到回退地址（保持加载态），false 表示最终失败 */
  const handleError = () => {
    if (fallbackSrc && src !== fallbackSrc) {
      setUsingFallback(true)
      return true
    }
    return false
  }

  return { src, handleError }
}
