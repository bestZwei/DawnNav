export const PLUGIN_ID = "quote-marquee"

// 滚动速度（px/秒）：跑马灯行程 = 视口宽 + 文本宽，按此速度折算单条时长
export const TICKER_SPEED_PXS = 56

// 单条最短展示时长（秒）：安全下限，常规视口下行程折算均高于此值，不会触发
export const MIN_DURATION_SECONDS = 5

// 单条最长展示时长（秒）：仅极少数超长语录触发，避免一条停留过久；
// 上限取值需让绝大多数条目保持 TICKER_SPEED_PXS 恒速（速度不一致的观感主要来自此处）
export const MAX_DURATION_SECONDS = 90

// 静态轮换间隔（秒）：全局动效关闭或系统减弱动态时的兜底展示节奏
export const STATIC_ROTATE_SECONDS = 12

// 兜底动画时长（秒）：与 tailwind.config.ts 的 animate-marquee 默认值保持一致。
// 仅在挂载后量宽完成前短暂使用；自愈定时器亦以此为基准
export const DEFAULT_DURATION_SECONDS = 30

// 隐藏超过该时长（毫秒）后回到前台才重跑当前条目：
// 短暂切换（几帧内）不打断正在滚动的句子
export const RESUMABLE_HIDDEN_MS = 1000
