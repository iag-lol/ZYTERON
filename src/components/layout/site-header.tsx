"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { Container } from "./container";
import { solutionFamilies } from "@/content/solutions";
import { PortalAccessLink } from "./portal-access-link";

const navigation = [
  { href: "/casos-exito", label: "Proyectos" },
  { href: "/integraciones", label: "Integraciones" },
  { href: "/planes", label: "Precios" },
  { href: "/cotizador/manual", label: "Cotizar online" },
  { href: "/quienes-somos", label: "Empresa" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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
    <header
      className="site-header sticky top-0 z-30"
      data-scrolled={scrolled}
      style={{ viewTransitionName: "site-header" }}
    >
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
          <nav
            aria-label="Navegación principal"
            className="main-nav hidden items-center gap-1 xl:flex"
          >
            <details
              className="solutions-menu"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary>
                Soluciones <ChevronDown size={14} />
              </summary>
              <div className="solutions-menu-panel">
                {solutionFamilies.map((family) => (
                  <Link
                    key={family.id}
                    href={`/servicios#${family.id}`}
                    onClick={(event) => {
                      event.currentTarget.closest("details")?.removeAttribute("open");
                    }}
                  >
                    {family.shortName}
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
                <Link
                  href="/servicios"
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  Ver todas las soluciones
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </details>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="nav-link"
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
              className="menu-toggle press flex min-h-11 min-w-11 items-center justify-center xl:hidden"
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
            className="mobile-nav mt-4 grid max-h-[75dvh] gap-1 overflow-y-auto border-t border-slate-200 pt-3 xl:hidden"
          >
            <Link
              onClick={() => setOpen(false)}
              href="/servicios"
              className="rounded-lg px-3 py-3 font-semibold"
            >
              Soluciones
            </Link>
            <div className="mobile-solutions">
              {solutionFamilies.map((family) => (
                <Link
                  key={family.id}
                  href={`/servicios#${family.id}`}
                  onClick={() => setOpen(false)}
                >
                  {family.shortName}
                </Link>
              ))}
            </div>
            {[
              ...navigation,
              { href: "/recursos", label: "Recursos" },
              { href: "/blog", label: "Blog" },
              { href: "/faq", label: "Preguntas frecuentes" },
              { href: "/soporte-ti", label: "Soporte TI" },
            ].map((item) => (
              <Link
                onClick={() => setOpen(false)}
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm"
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
