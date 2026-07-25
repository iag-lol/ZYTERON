import type { Metadata } from "next";
import { WhatsappInbox } from "@/components/admin/whatsapp/whatsapp-inbox";

export const metadata: Metadata = {
  title: "WhatsApp · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default function WhatsappPage() {
  return <WhatsappInbox />;
}
