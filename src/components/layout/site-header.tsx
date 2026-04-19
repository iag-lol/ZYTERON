"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Container } from "./container";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/casos-exito", label: "Casos" },
  { href: "/blog", label: "Blog" },
  { href: "/ciudades", label: "Ciudades" },
  { href: "/planes", label: "Planes" },
  { href: "/paquetes", label: "Cotizador" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-lg shadow-sm">
      <Container className="flex items-center justify-between py-3.5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 font-extrabold text-white text-lg shadow-md shadow-blue-900/20 transition-shadow group-hover:shadow-blue-900/35">
            Z
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900 tracking-wide">Zyteron</p>
            <p className="text-[10px] text-blue-600 tracking-widest uppercase font-semibold">Web · SEO · TI</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-1 transition-colors hover:text-blue-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-[width] hover:after:w-full after:rounded-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-[#25d366]/10 px-3.5 py-2 text-sm font-semibold text-[#18a34d] border border-[#25d366]/25 transition-all hover:bg-[#25d366]/20"
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp
          </Link>
          <Button asChild size="sm" className="gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-blue-700/25 shadow-md btn-primary-glow">
            <Link href="/paquetes">
              Cotizar ahora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Hamburger */}
        <button
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {/* Mobile Menu */}
      <div
        className={cn(
          "lg:hidden border-t border-slate-100 bg-white shadow-lg transition-[max-height,opacity] duration-300",
          open ? "max-h-[600px] opacity-100" : "max-h-0 overflow-hidden opacity-0",
        )}
      >
        <Container className="flex flex-col gap-1 py-4">
          {navItems.map((item) => (
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
              href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#25d366]/10 px-4 py-2.5 text-sm font-semibold text-[#18a34d] border border-[#25d366]/25"
              onClick={() => setOpen(false)}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Escribir por WhatsApp
            </Link>
            <Button asChild className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold">
              <Link href="/paquetes" onClick={() => setOpen(false)}>
                Armar paquete ahora
              </Link>
            </Button>
          </div>
        </Container>
      </div>
    </header>
  );
}
