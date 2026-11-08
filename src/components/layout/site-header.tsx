"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Container } from "./container";
import { PortalAccessLink } from "./portal-access-link";

const navigation = [
  { href: "/desarrollo-web", label: "Desarrollo web" },
  { href: "/sistemas-web", label: "Sistemas" },
  { href: "/casos-exito", label: "Proyectos" },
  { href: "/planes", label: "Precios" },
  { href: "/quienes-somos", label: "Empresa" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="site-header sticky top-0 z-30">
      <Container className="py-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Zyteron, inicio"
            className="brand flex shrink-0 items-center gap-2.5"
            onClick={() => setOpen(false)}
          >
            <span className="brand-symbol">Z</span>
            <span className="brand-name">zyteron</span>
          </Link>
          <nav aria-label="Navegación principal" className="hidden items-center gap-1 xl:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 aria-[current=page]:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <PortalAccessLink size="sm" label="Portal clientes" />
            </div>
            <Link href="/contacto" className="design-button hidden sm:inline-flex">
              Conversemos <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              ref={toggleRef}
              type="button"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 xl:hidden"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            ref={menuRef}
            id="mobile-navigation"
            aria-label="Navegación móvil"
            className="mt-4 grid max-h-[75dvh] gap-1 overflow-y-auto border-t border-slate-200 pt-3 xl:hidden"
          >
            {[
              ...navigation,
              { href: "/contacto", label: "Contacto" },
              { href: "/tiendas-online", label: "Tiendas online" },
              { href: "/automatizacion", label: "Automatización" },
              { href: "/demos", label: "Demos" },
              { href: "/blog", label: "Recursos y blog" },
              { href: "/faq", label: "Preguntas frecuentes" },
              { href: "/servicios", label: "Todos los servicios" },
            ].map((item) => (
              <Link
                onClick={() => setOpen(false)}
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-blue-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="p-3">
              <PortalAccessLink size="sm" label="Portal clientes" />
            </div>
          </nav>
        )}
      </Container>
    </header>
  );
}
