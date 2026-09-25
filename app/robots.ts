import { MetadataRoute } from "next"
import { getRequestBaseUrl } from "@/lib/site-url"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const sitemapUrl = `${await getRequestBaseUrl()}/sitemap.xml`
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/search"],
      },
    ],
    sitemap: sitemapUrl,
  }
}
