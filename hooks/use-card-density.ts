"use client"

import { useState, useEffect } from "react"

export type CardViewMode = "standard" | "compact" | "overview"
export type CardDensity = Exclude<CardViewMode, "overview">

const STORAGE_KEY = "dawnnav_card_density"
const EVENT_NAME = "dawnnav-card-density-change"
// 旧键名（更名前）仅用于读取回退，避免老用户本地设置丢失
const LEGACY_STORAGE_KEY = "conan_nav_card_density"

export function useCardDensity() {
  const [density, setDensityState] = useState<CardViewMode>("standard")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 从 localStorage 读取存储的模式
    try {
      const stored = (localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY)) as CardViewMode | null
      if (stored === "compact" || stored === "standard" || stored === "overview") {
        setDensityState(stored)
      }
    } catch {
      // 忽略 localStorage 限制
    }
    setMounted(true)

    // 监听多组件间同步事件
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CardViewMode>
      if (
        customEvent.detail === "compact" ||
        customEvent.detail === "standard" ||
        customEvent.detail === "overview"
      ) {
        setDensityState(customEvent.detail)
      }
    }

    window.addEventListener(EVENT_NAME, handleCustomEvent)
    return () => window.removeEventListener(EVENT_NAME, handleCustomEvent)
  }, [])

  const setDensity = (newDensity: CardViewMode) => {
    setDensityState(newDensity)
    try {
      localStorage.setItem(STORAGE_KEY, newDensity)
    } catch {
      // 忽略
    }
    window.dispatchEvent(new CustomEvent<CardViewMode>(EVENT_NAME, { detail: newDensity }))
  }

  const toggleDensity = () => {
    const next =
      density === "standard"
        ? "compact"
        : density === "compact"
          ? "overview"
          : "standard"
    setDensity(next)
    return next
  }

  return {
    density,
    setDensity,
    toggleDensity,
    isCompact: density === "compact",
    isOverview: density === "overview",
    mounted,
  }
}
