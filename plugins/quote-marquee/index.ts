import { Quote } from "lucide-react"
import type { PluginDefinition } from "@/lib/plugins/types"
import { QuoteTicker } from "./quote-ticker"
import { PLUGIN_ID } from "./constants"

// 名言跑马灯插件：顶栏下方一行横幅，逐条从右向左滚动展示素材句子。
// 素材为通用「两行一条」格式（正文一行 + 其他一行），
// 由 scripts/normalize-quotes.mjs 规范化编译为 quotes.json，替换素材无需改动插件
export const quoteMarqueePlugin: PluginDefinition = {
  id: PLUGIN_ID,
  nameKey: "plugins.quoteMarquee.name",
  descriptionKey: "plugins.quoteMarquee.description",
  icon: Quote,
  version: "1.0.0",
  author: "kenanlabs",
  defaultEnabled: false,
  configFields: [],
  bannerSlot: QuoteTicker,
}
