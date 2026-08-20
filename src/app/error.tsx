"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-white px-6 py-20">
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Error temporal</p>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          Algo no salió como esperábamos
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          Fue un problema momentáneo de nuestra parte. Puedes reintentar ahora mismo o volver al
          inicio para seguir navegando.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Button
            size="lg"
            className="bg-blue-700 font-bold text-white hover:bg-blue-800"
            onClick={() => unstable_retry()}
          >
            Reintentar
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          >
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
