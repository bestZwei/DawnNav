"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import Link from "next/link"
import Image from "next/image"
import { useState, type ReactNode } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

// 安全的 Markdown 渲染组件：
// - 不启用 rehype-raw，原始 HTML 按纯文本处理，天然防 XSS
// - 链接强制新窗口 + noopener noreferrer
// - 图片懒加载，加载失败显示占位样式
// - 长 URL / 长单词 / 宽表格不会撑爆容器（anywhere 参与 min-content 计算，
//   即使父级是 grid/flex 布局也能正确收缩；宽表格/代码块走横向滚动）
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content min-w-0 max-w-full text-sm leading-relaxed text-foreground/90 break-words [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <Link
              href={href || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
            >
              {children}
            </Link>
          ),
          p: ({ children }) => <p className="my-2 min-w-0 break-words [overflow-wrap:anywhere]">{children}</p>,
          h1: ({ children }) => <h1 className="mt-4 mb-2 text-lg font-semibold break-words">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 mb-2 text-base font-semibold break-words">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-sm font-semibold break-words">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-3 mb-1.5 text-sm font-semibold break-words">{children}</h4>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
          li: ({ children }) => <li className="break-words">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border/80 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ children, className }: { children?: ReactNode; className?: string }) => {
            const isBlock = typeof className === "string" && className.startsWith("language-")
            if (isBlock) {
              return <code className={className}>{children}</code>
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs break-all">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border/60 px-2 py-1.5 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-border/40 px-2 py-1.5 align-top break-words">{children}</td>,
          hr: () => <hr className="my-4 border-border/60" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          img: ({ src, alt }) => {
            const srcStr = typeof src === "string" ? src : ""
            // 空地址（如 Markdown 的 ![]()）直接按失败占位渲染，避免 next/image 抛错
            if (!srcStr) {
              return <MarkdownImagePlaceholder alt={alt} />
            }
            return <MarkdownImage srcStr={srcStr} alt={alt} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// 加载失败/空地址占位
function MarkdownImagePlaceholder({ alt }: { alt?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border/80 bg-muted/20 px-2.5 py-1.5 text-xs text-muted-foreground">
      <ImageOff className="h-3.5 w-3.5" />
      {alt || "image"}
    </span>
  )
}

// Markdown 内嵌图片：加载完成前透明、onLoad 后淡入（避免图片加载后瞬间蹦出），
// 失败回落占位样式。状态收敛到单图组件内，取代原先挂在外层的 failedImages 映射
function MarkdownImage({ srcStr, alt }: { srcStr: string; alt?: string }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // 缓存图可能在 React 水合/节点重建之前就完成了加载，onLoad 不会再触发；
  // 挂载时直接按 complete/naturalWidth 同步状态，避免图片永久停在透明态
  // （与 site-card SiteIcon 的 syncLoadedImage 同款兜底）
  const syncLoadedImage = (node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setLoaded(true)
    }
  }

  if (failed) {
    return <MarkdownImagePlaceholder alt={alt} />
  }

  return (
    <Image
      ref={syncLoadedImage}
      src={srcStr}
      alt={alt || ""}
      width={800}
      height={450}
      unoptimized
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        "my-2 h-auto max-w-full rounded-lg border border-border/60 transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
      )}
    />
  )
}