import type { Metadata } from "next";
import { WhatsappInbox } from "@/components/admin/whatsapp/whatsapp-inbox";

export const metadata: Metadata = {
  title: "WhatsApp · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default function WhatsappPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bandeja de atención en tiempo real: conversaciones, control de IA, leads y estados de entrega.
        </p>
      </div>
      <WhatsappInbox />
    </div>
  );
}
