"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container } from "./container";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/productos", label: "Productos" },
  { href: "/planes", label: "Planes" },
  { href: "/paquetes", label: "Cotizador" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

const WspIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
            <WspIcon />
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
              <WspIcon />
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
