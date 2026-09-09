import type { Metadata } from "next";
import { WhatsappInbox } from "@/components/admin/whatsapp/whatsapp-inbox";

export const metadata: Metadata = {
  title: "WhatsApp · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams?: Promise<{ conversation?: string }>;
}) {
  const query = await searchParams;
  return <WhatsappInbox initialConversationId={query?.conversation ?? null} />;
}
