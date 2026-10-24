"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DateInput, Drawer, Feedback, Field, useAction } from "./fx-ui";
import { parseDay } from "@control/lib/finance-format";
import { paymentCivilDate } from "@/lib/payments/payment-projection";

export function ReceivableDueButton({
  clientId,
  item,
  onChanged,
  initialOpen = false,
  hideTrigger = false,
  onClosed,
}: {
  clientId: string;
  item: { id: string; dueAt: string | null; description: string };
  onChanged: () => Promise<void>;
  initialOpen?: boolean;
  hideTrigger?: boolean;
  onClosed?: () => void;
}) {
  const [open, setOpen] = useState(initialOpen),
    [date, setDate] = useState(item.dueAt ? paymentCivilDate(item.dueAt) || "" : ""),
    [valid, setValid] = useState(true),
    [reason, setReason] = useState("");
  const action = useAction();
  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          className="fx-btn small ghost"
          onClick={() => {
            setReason("");
            action.setError("");
            setOpen(true);
          }}
        >
          Cambiar vencimiento
        </button>
      ) : null}
      {open
        ? createPortal(
            <div className="zy-full-control">
              <Drawer
                open
                title="Cambiar vencimiento del cobro"
                subtitle={item.description}
                onClose={() => {
                  if (!action.busy) {
                    setOpen(false);
                    onClosed?.();
                  }
                }}
              >
                <div className="fx-form">
                  <Field label="Nuevo vencimiento">
                    <div
                      onInputCapture={(e) =>
                        setValid(Boolean(parseDay((e.target as HTMLInputElement).value)))
                      }
                    >
                      <DateInput required value={date} onChange={setDate} />
                    </div>
                  </Field>
                  <Field label="Motivo" span={3}>
                    <textarea
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </Field>
                </div>
                <p className="fx-hint">
                  Se cambia sólo el vencimiento pendiente. Los montos, abonos y documentos
                  permanecen en su registro.
                </p>
                <Feedback error={action.error} />
                <button
                  className="fx-btn primary"
                  disabled={action.busy || !valid || !date || reason.trim().length < 3}
                  onClick={async () => {
                    const result = await action.run(async () => {
                      const r = await fetch(
                        `/api/portal/admin/clients/${clientId}/receivables/${encodeURIComponent(item.id)}/due-date`,
                        {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            dueDate: date,
                            expectedDueAt: item.dueAt,
                            reason,
                          }),
                        },
                      );
                      const d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      return d;
                    });
                    if (result) {
                      setOpen(false);
                      await onChanged();
                      onClosed?.();
                    }
                  }}
                >
                  Guardar vencimiento
                </button>
              </Drawer>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
