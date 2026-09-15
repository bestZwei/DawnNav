export const PLUGIN_ID = "quote-marquee"

// 滚动速度（px/秒）：跑马灯行程 = 视口宽 + 文本宽，按此速度折算单条时长。
// 刻意不设时长上限：封顶会让超长语录提速（行程 ÷ 上限 > 本速度），
// 造成「长句子滚得更快」的观感不一致；长句只是走得更久，悬停可暂停细读
export const TICKER_SPEED_PXS = 56

// 单条最短展示时长（秒）：安全下限，防止极短句一闪而过
export const MIN_DURATION_SECONDS = 5

// 静态轮换间隔（秒）：全局动效关闭或系统减弱动态时的兜底展示节奏
export const STATIC_ROTATE_SECONDS = 12

// 兜底动画时长（秒）：与 tailwind.config.ts 的 animate-marquee 默认值保持一致。
// 仅在挂载后量宽完成前短暂使用；自愈定时器亦以此为基准
export const DEFAULT_DURATION_SECONDS = 30

// 隐藏超过该时长（毫秒）后回到前台才重跑当前条目：
// 短暂切换（几帧内）不打断正在滚动的句子
export const RESUMABLE_HIDDEN_MS = 1000
