import { ChevronDown } from "lucide-react";

type FaqItem = {
  q: string;
  a: string;
};

function FaqColumn({ faqs, openFirst }: { faqs: FaqItem[]; openFirst?: boolean }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <details key={faq.q} className="faq-item card-premium" open={openFirst && index === 0}>
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 text-left">
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">{faq.q}</h3>
            <span className="faq-chevron inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-1.5 text-blue-700">
              <ChevronDown className="h-4 w-4" />
            </span>
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}

/**
 * Acordeón de preguntas frecuentes con details/summary nativo: el texto de
 * las respuestas queda siempre en el HTML (indexable) y la apertura se anima
 * sólo con CSS, sin JavaScript.
 */
export function HomeFaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const midpoint = Math.ceil(faqs.length / 2);
  const leftColumn = faqs.slice(0, midpoint);
  const rightColumn = faqs.slice(midpoint);

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      <FaqColumn faqs={leftColumn} openFirst />
      <FaqColumn faqs={rightColumn} />
    </div>
  );
}
