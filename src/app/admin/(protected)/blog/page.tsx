import { BlogManager, type BlogPostRow } from "@/components/admin/blog-manager";
import { getAllBlogPosts } from "@/lib/admin/blog-cases-repository";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await getAllBlogPosts();
  const rows: BlogPostRow[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImageUrl: p.coverImageUrl,
    coverImageAlt: p.coverImageAlt,
    category: p.category,
    tags: p.tags,
    readMinutes: p.readMinutes,
    author: p.author,
    status: p.status,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    keywords: p.keywords,
    ogImageUrl: p.ogImageUrl,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
  }));

  return <BlogManager posts={rows} />;
}
