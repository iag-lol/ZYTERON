import { getPublishedBlogPosts } from "@/lib/admin/blog-cases-repository";
import { buildRssFeed } from "@/lib/seo/rss";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const posts = await getPublishedBlogPosts();

  return new Response(buildRssFeed(posts), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
