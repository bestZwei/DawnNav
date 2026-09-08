export const locales = ["zh", "en"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "zh"

export const LOCALE_COOKIE = "NEXT_LOCALE"

// Cookie 有效期一年，与常见 i18n 方案保持一致
export const LOCALE_COOKIE_MAX_AGE = 31536000

// 受支持语言的展示名称（语言切换下拉与设置页共用）
export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
}

export function isLocale(
  value: string | null | undefined
): value is Locale {
  return locales.includes(value as Locale)
}

// locale 到 <html lang> 标签的映射
export function htmlLang(locale: string): string {
  return locale === "zh" ? "zh-CN" : locale
}
