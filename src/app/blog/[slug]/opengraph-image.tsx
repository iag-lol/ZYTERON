import { notFound } from "next/navigation";
import { generateZyteronOgImage, ogImageSize } from "@/lib/og-image";
import { getBlogPostBySlug } from "@/content/blog-posts";

export const size = ogImageSize;
export const contentType = "image/png";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPostOpenGraphImage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return generateZyteronOgImage({
    title: post.title,
    subtitle: post.excerpt,
    tag: post.primaryKeyword,
  });
}
