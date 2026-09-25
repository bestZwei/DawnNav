"use client"

import { useCallback, useEffect, useId, useRef } from "react"

// 弹窗接入浏览器历史：open 时压入一条同文档历史记录，让移动端返回键 /
// 桌面端浏览器后退关闭弹窗本身，而不是直接离开页面。
// 嵌套弹窗（详情弹窗 > 截图 Lightbox）各持独立标记：popstate 时按
// 「当前条目是否属于自己」判断，内层条目先被弹出、先关闭，逐级消费。
// 关闭路径分两种，最终都保证历史栈平衡（不留悬挂条目）：
// - 返回键 / 后退：popstate 到达时条目已被浏览器弹出，直接关闭 state；
// - UI 关闭（X / 遮罩 / Esc）：先 history.back() 消费自己压入的条目，
//   popstate 回调再执行真正关闭。
// 注意：父级在弹窗打开状态下直接卸载本组件时，压入的条目无法安全消费
// （clean up 中调用 history.back() 会与 StrictMode 双执行及并发导航竞态），
// 会留下一条悬挂的同文档条目——下一次返回只弹掉它不换页，属可接受降级。
export function useDialogHistoryBack(
  open: boolean,
  onOpenChange: (open: boolean) => void,
): () => void {
  const markerId = useId()
  // 关闭回调走 ref：popstate 监听只随 open 建拆，不随调用方回调重建
  const closeRef = useRef(onOpenChange)
  closeRef.current = onOpenChange

  useEffect(() => {
    if (!open) return
    // StrictMode 双执行 / 同条目重复 open 时避免重复压入
    if (window.history.state?.__dialogHistory !== markerId) {
      window.history.pushState({ __dialogHistory: markerId }, "")
    }

    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { __dialogHistory?: string } | null
      // 当前条目仍是自己的标记 → 弹掉的是内层（如 Lightbox）条目，自己保持打开
      if (state?.__dialogHistory !== markerId) {
        closeRef.current(false)
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [open, markerId])

  // UI 主动关闭：栈顶是自己的条目时经 history.back() 消费（popstate 回调关闭），
  // 其余情况（条目已被返回键弹掉、或从未压入）直接关闭
  return useCallback(() => {
    if (window.history.state?.__dialogHistory === markerId) {
      window.history.back()
    } else {
      closeRef.current(false)
    }
  }, [markerId])
}
