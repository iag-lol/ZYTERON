"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Eye, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type DemoCard = {
  title: string;
  description: string;
  tech: string;
  demoHref?: string;
  gallery?: string[];
  priceFrom?: string;
  includes?: string[];
  note?: string;
};

type DemosGridProps = {
  demos: DemoCard[];
};

export function DemosGrid({ demos }: DemosGridProps) {
  const [activeDemo, setActiveDemo] = useState<DemoCard | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const activeGallery = useMemo(() => activeDemo?.gallery ?? [], [activeDemo]);
  const activeImageSrc = activeGallery[activeImageIndex] ?? activeGallery[0] ?? "";
  const activeIncludes = useMemo(() => {
    if (!activeDemo) return [];
    if (activeDemo.includes?.length) return activeDemo.includes;
    return activeDemo.tech
      .split("·")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [activeDemo]);

  function openDemoModal(demo: DemoCard) {
    setActiveDemo(demo);
    setActiveImageIndex(0);
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {demos.map((demo) => (
          <article key={demo.title} className="card-premium overflow-hidden">
            <div className="bg-grid-light border-b border-slate-200 p-5">
              {demo.gallery?.length ? (
                <button
                  type="button"
                  onClick={() => openDemoModal(demo)}
                  className="group relative grid aspect-[16/9] w-full grid-cols-2 gap-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left"
                  aria-label={`Abrir galería de ${demo.title}`}
                >
                  {demo.gallery.slice(0, 4).map((src, index) => (
                    <div key={src} className="relative">
                      <Image
                        src={src}
                        alt={`${demo.title} vista ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  ))}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-3 py-2">
                    <p className="text-xs font-semibold text-white">Click para ampliar galería</p>
                  </div>
                </button>
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/80">
                  <div className="text-center">
                    <LayoutTemplate className="mx-auto h-6 w-6 text-blue-700" />
                    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-blue-700">Demo funcional</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3 p-5">
              <h2 className="text-base font-bold text-slate-900">{demo.title}</h2>
              <p className="text-sm text-slate-600">{demo.description}</p>
              <p className="text-xs text-slate-500">{demo.tech}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {demo.gallery?.length ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300 text-slate-800 hover:bg-slate-50"
                    onClick={() => openDemoModal(demo)}
                  >
                    <Eye className="h-4 w-4" /> Ver demo
                  </Button>
                ) : demo.demoHref ? (
                  <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                    <a href={demo.demoHref} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" /> Ver demo
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                    <Link href="/contacto?origen=demo">
                      <Eye className="h-4 w-4" /> Ver demo
                    </Link>
                  </Button>
                )}

                <Button asChild size="sm" className="bg-blue-700 text-white hover:bg-blue-800">
                  <Link href={`/contacto?origen=demo&item=${encodeURIComponent(demo.title)}`}>
                    Cotizar algo similar
                  </Link>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(activeDemo)} onOpenChange={(open) => (!open ? setActiveDemo(null) : undefined)}>
        <DialogContent className="max-h-[94vh] w-[min(1160px,96vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[1160px]">
          <DialogHeader className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <DialogTitle className="text-xl font-extrabold text-slate-900">{activeDemo?.title}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">{activeDemo?.description}</DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[calc(94vh-92px)] overflow-hidden lg:grid-cols-[1.45fr_0.85fr]">
            <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
              {activeImageSrc ? (
                <>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <Image
                      src={activeImageSrc}
                      alt={`${activeDemo?.title ?? "Demo"} imagen principal`}
                      fill
                      sizes="(max-width: 1024px) 90vw, 60vw"
                      className="object-cover"
                    />
                  </div>

                  {activeGallery.length > 1 ? (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {activeGallery.map((src, index) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`relative aspect-[4/3] overflow-hidden rounded-lg border ${
                            activeImageIndex === index ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200"
                          }`}
                          aria-label={`Ver imagen ${index + 1}`}
                        >
                          <Image
                            src={src}
                            alt={`${activeDemo?.title ?? "Demo"} miniatura ${index + 1}`}
                            fill
                            sizes="20vw"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                  No hay imágenes disponibles para este demo.
                </div>
              )}
            </div>

            <aside className="overflow-y-auto p-5">
              {activeDemo?.priceFrom ? <p className="text-lg font-extrabold text-blue-700">{activeDemo.priceFrom}</p> : null}

              <h3 className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Qué contiene esta web</h3>
              <div className="mt-2 space-y-2">
                {activeIncludes.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-600">
                {activeDemo?.note ??
                  "Precio final según funciones, cantidad de productos, medios de pago, integraciones y nivel de personalización."}
              </p>

              <div className="mt-5 grid gap-2">
                {activeDemo?.demoHref ? (
                  <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                    <a href={activeDemo.demoHref} target="_blank" rel="noopener noreferrer">
                      Abrir demo online <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={`/contacto?origen=demo&item=${encodeURIComponent(activeDemo?.title ?? "Demo")}`}>
                    Cotizar esta solución
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
