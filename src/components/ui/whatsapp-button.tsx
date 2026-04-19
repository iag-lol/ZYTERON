"use client";

import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

export function WhatsAppButton() {
  return (
    <Link
      href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] wsp-pulse transition-transform duration-200 hover:scale-110"
    >
      <WhatsAppIcon className="h-7 w-7 text-white" />
    </Link>
  );
}
