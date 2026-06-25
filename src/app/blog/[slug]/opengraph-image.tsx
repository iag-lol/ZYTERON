import { notFound } from "next/navigation";
import { generateZyteronOgImage, ogImageSize } from "@/lib/og-image";
import { getDbBlogPost } from "@/lib/content/blog-merge";

export const size = ogImageSize;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPostOpenGraphImage({ params }: Props) {
  const { slug } = await params;
  const post = await getDbBlogPost(slug);

  if (!post) {
    notFound();
  }

  return generateZyteronOgImage({
    title: post.title,
    subtitle: post.excerpt ?? undefined,
    tag: post.category ?? post.keywords ?? undefined,
  });
}
