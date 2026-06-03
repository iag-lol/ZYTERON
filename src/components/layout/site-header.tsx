"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Container } from "./container";
import { PortalAccessLink } from "./portal-access-link";

const WHATSAPP_URL =
  "https://wa.me/56984752936?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.";

const primaryNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/demos", label: "Demos" },
  { href: "/productos", label: "Productos TI" },
  { href: "/planes", label: "Planes" },
  { href: "/blog", label: "Blog" },
  { href: "/paquetes", label: "Cotizar" },
  { href: "/contacto", label: "Contacto" },
];

const secondaryNavItems = [
  { href: "/nosotros", label: "Nosotros" },
  { href: "/quienes-somos", label: "Quiénes Somos" },
  { href: "/casos-exito", label: "Casos" },
  { href: "/faq", label: "FAQ" },
];

const servicesHubItem = { href: "/servicios", label: "Todos los servicios" };

const servicesNavItems = [
  { href: "/desarrollo-web", label: "Desarrollo Web" },
  { href: "/tiendas-online", label: "Tiendas Online" },
  { href: "/sistemas-web", label: "Sistemas Web" },
  { href: "/automatizacion", label: "Automatización" },
  { href: "/soporte-ti", label: "Soporte TI" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const firstMobileLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) return;
    firstMobileLinkRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
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
              <PortalAccessLink size="sm" label="Portal" />
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
              <PortalAccessLink />
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
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="text-xs font-semibold">{open ? "Cerrar" : "Menú"}</span>
            </button>
          </div>

          <div className="mt-3 hidden items-center justify-between gap-4 lg:flex">
            <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-700 transition-colors hover:bg-white hover:text-blue-700"
              >
                Inicio
              </Link>
              <div
                className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <Link
                  href="/servicios"
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-700 transition-colors hover:bg-white hover:text-blue-700"
                  onFocus={() => setServicesOpen(true)}
                  aria-expanded={servicesOpen}
                  aria-controls="desktop-services-menu"
                >
                  Servicios <ChevronDown className="h-3.5 w-3.5" />
                </Link>
                {servicesOpen ? (
                  <div id="desktop-services-menu" className="absolute left-0 top-full z-40 w-64 pt-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <Link
                        href={servicesHubItem.href}
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                        onClick={() => setServicesOpen(false)}
                      >
                        {servicesHubItem.label}
                      </Link>
                      <div className="my-1 h-px bg-slate-100" />
                      {servicesNavItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => setServicesOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              {primaryNavItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-blue-700 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <nav className="flex flex-wrap items-center gap-1">
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </Container>
      </header>

      {/* Mobile Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <div
        id="mobile-navigation"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 sm:px-6">
          <span className="text-sm font-bold tracking-wide text-slate-900">MENÚ</span>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex h-[calc(100vh-4rem)] flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="flex flex-col space-y-1">
              <Link
                ref={firstMobileLinkRef}
                href="/"
                className="flex items-center rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                onClick={() => setOpen(false)}
              >
                Inicio
              </Link>
              
              <div className="mt-1 mb-1">
                <button
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  aria-expanded={mobileServicesOpen}
                >
                  Servicios
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform duration-200",
                      mobileServicesOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    mobileServicesOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="mt-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 mx-1">
                    <Link
                      href={servicesHubItem.href}
                      className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100/50"
                      onClick={() => setOpen(false)}
                    >
                      {servicesHubItem.label}
                    </Link>
                    <div className="my-1.5 h-px bg-slate-200/60 mx-3" />
                    {servicesNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-blue-700 hover:shadow-sm"
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {primaryNavItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-4 h-px bg-slate-100" />
              
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:px-6 backdrop-blur-md">
            <div className="flex flex-col gap-3">
              <PortalAccessLink
                className="w-full justify-center py-3"
                label="Portal de clientes"
                onClick={() => setOpen(false)}
              />
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366]/10 px-4 py-3 text-sm font-bold text-[#18a34d] transition-colors hover:bg-[#25d366]/20"
                onClick={() => setOpen(false)}
              >
                <WhatsAppIcon className="h-5 w-5" />
                Hablar por WhatsApp
              </Link>
              <Button asChild className="w-full rounded-xl bg-blue-700 py-6 text-base font-bold text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 hover:shadow-lg hover:shadow-blue-700/30">
                <Link href="/paquetes" onClick={() => setOpen(false)}>
                  Cotizar mi proyecto <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
