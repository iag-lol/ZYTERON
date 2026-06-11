"use client";

import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { siteConfig } from "@/config/site";

const WHATSAPP_URL =
  `${siteConfig.social.whatsapp}?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.`;

export function WhatsAppButton() {
  return (
    <Link
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#25d366]/30 transition-transform duration-200 hover:scale-[1.02] sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon className="h-5 w-5 text-white" />
      <span className="hidden md:inline">WhatsApp</span>
    </Link>
  );
}
