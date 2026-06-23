"use client";

import { SelectHTMLAttributes, useTransition } from "react";

export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative inline-flex items-center">
      <select
        {...props}
        className={`${props.className} ${isPending ? "opacity-50" : ""}`}
        disabled={props.disabled || isPending}
        onChange={(e) => {
          if (props.onChange) {
            props.onChange(e);
          }
          const form = e.target.form;
          if (form) {
            startTransition(() => {
              form.requestSubmit();
            });
          }
        }}
      />
      {isPending && (
        <div className="pointer-events-none absolute right-8 flex h-full items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        </div>
      )}
    </div>
  );
}
