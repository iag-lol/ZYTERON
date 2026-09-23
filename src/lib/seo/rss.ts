import { siteConfig } from "@/config/site";
import type { DbBlogPost } from "@/lib/admin/blog-cases-repository";
import { buildAbsoluteUrl } from "@/lib/schema";

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asRfc822Date(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toUTCString();
}

function buildItem(post: DbBlogPost) {
  const url = buildAbsoluteUrl(`/blog/${post.slug}`);
  const publishedAt = asRfc822Date(post.publishedAt ?? post.createdAt);
  const categories = [post.category, ...(post.tags ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [
    "    <item>",
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
    `      <description>${escapeXml(post.excerpt?.trim() || post.metaDescription?.trim() || "Artículo de Zyteron")}</description>`,
    ...(publishedAt ? [`      <pubDate>${publishedAt}</pubDate>`] : []),
    `      <dc:creator>${escapeXml(post.author?.trim() || siteConfig.legalName)}</dc:creator>`,
    ...categories.map((category) => `      <category>${escapeXml(category)}</category>`),
    "    </item>",
  ].join("\n");
}

export function buildRssFeed(posts: DbBlogPost[], generatedAt = new Date()) {
  const feedUrl = buildAbsoluteUrl("/rss.xml");
  const blogUrl = buildAbsoluteUrl("/blog");
  const newestContentDate = posts
    .map((post) => post.updatedAt ?? post.publishedAt ?? post.createdAt)
    .map((value) => (value ? new Date(value) : null))
    .filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const lastBuildDate = newestContentDate?.toUTCString() ?? generatedAt.toUTCString();
  const items = posts.map(buildItem).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${siteConfig.name} — Blog para empresas`)}</title>
    <link>${escapeXml(blogUrl)}</link>
    <description>${escapeXml("Guías sobre desarrollo web, sistemas, ecommerce, automatización, soporte TI y SEO para empresas en Chile.")}</description>
    <language>${escapeXml(siteConfig.locale)}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
