import { redirect } from "next/navigation";

type CaseDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CaseDetailPage({ params }: CaseDetailProps) {
  await params;
  redirect("/productos");
}
