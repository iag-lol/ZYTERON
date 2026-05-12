"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Container } from "./container";

const WHATSAPP_URL =
  "https://wa.me/56984752936?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.";

const primaryNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/demos", label: "Demos" },
  { href: "/productos", label: "Productos TI" },
  { href: "/planes", label: "Planes" },
  { href: "/paquetes", label: "Cotizar" },
  { href: "/contacto", label: "Contacto" },
];

const secondaryNavItems = [
  { href: "/nosotros", label: "Nosotros" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

const mobileNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/demos", label: "Demos" },
  { href: "/productos", label: "Productos TI" },
  { href: "/planes", label: "Planes" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/paquetes", label: "Cotizar" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-lg">
      <Container className="py-3.5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-lg font-extrabold text-white shadow-md shadow-blue-900/20 transition-shadow group-hover:shadow-blue-900/35">
              Z
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide text-slate-900">ZYTERON</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                Web · Sistemas · Soporte TI
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex xl:hidden">
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#25d366]/30 bg-[#25d366]/10 px-3 py-1.5 text-xs font-semibold text-[#18a34d] transition-all hover:bg-[#25d366]/20"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              WhatsApp
            </Link>
            <Button asChild size="sm" className="bg-blue-700 px-3 font-bold text-white hover:bg-blue-800">
              <Link href="/paquetes">Cotizar</Link>
            </Button>
          </div>

          <div className="hidden items-center gap-2.5 xl:flex">
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[#25d366]/25 bg-[#25d366]/10 px-3.5 py-2 text-sm font-semibold text-[#18a34d] transition-all hover:bg-[#25d366]/20"
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp
            </Link>
            <Button
              asChild
              size="sm"
              className="btn-primary-glow gap-2 bg-blue-700 font-bold text-white shadow-md shadow-blue-700/25 hover:bg-blue-800"
            >
              <Link href="/paquetes">
                Solicitar cotización <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-3 hidden items-center justify-between gap-4 lg:flex">
          <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-blue-700 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="hidden items-center gap-1 xl:flex">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>

      <div
        className={cn(
          "border-t border-slate-100 bg-white shadow-lg transition-[max-height,opacity] duration-300 lg:hidden",
          open ? "max-h-[700px] opacity-100" : "max-h-0 overflow-hidden opacity-0",
        )}
      >
        <Container className="flex flex-col gap-1 py-4">
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-[#25d366]/25 bg-[#25d366]/10 px-4 py-2.5 text-sm font-semibold text-[#18a34d]"
              onClick={() => setOpen(false)}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Hablar por WhatsApp
            </Link>
            <Button asChild className="w-full bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/paquetes" onClick={() => setOpen(false)}>
                Cotizar mi proyecto
              </Link>
            </Button>
          </div>
        </Container>
      </div>
    </header>
  );
}
