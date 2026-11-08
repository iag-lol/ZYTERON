"use client";
import { useState } from "react";
type Criteria = {
  serviceFit: boolean;
  needConfirmed: boolean;
  viable: boolean;
  nextStep: string;
  serviceLine: string;
};
export function LeadQualification({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (criteria: Criteria) => Promise<void>;
}) {
  const [criteria, setCriteria] = useState<Criteria>({
    serviceFit: false,
    needConfirmed: false,
    viable: false,
    nextStep: "",
    serviceLine: "",
  });
  return (
    <form
      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void onConfirm(criteria);
      }}
    >
      <h4 className="font-semibold">Calificación comercial</h4>
      {(
        [
          ["serviceFit", "El requerimiento corresponde a un servicio de Zyteron"],
          ["needConfirmed", "La necesidad está confirmada con el contacto"],
          ["viable", "El alcance, presupuesto y plazo son viables"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex gap-2">
          <input
            type="checkbox"
            required
            checked={criteria[key]}
            onChange={(event) => setCriteria({ ...criteria, [key]: event.target.checked })}
          />
          {label}
        </label>
      ))}
      <label className="block">
        Línea de servicio
        <select
          className="block w-full rounded border p-2"
          required
          value={criteria.serviceLine}
          onChange={(event) => setCriteria({ ...criteria, serviceLine: event.target.value })}
        >
          <option value="">Seleccionar</option>
          <option value="web_ecommerce">Web y comercio electrónico</option>
          <option value="sistemas_automatizacion">Sistemas y automatización</option>
          <option value="soporte">Soporte</option>
        </select>
      </label>
      <label className="block">
        Siguiente paso acordado
        <textarea
          className="block w-full rounded border p-2"
          required
          minLength={5}
          maxLength={500}
          value={criteria.nextStep}
          onChange={(event) => setCriteria({ ...criteria, nextStep: event.target.value })}
        />
      </label>
      <div className="flex gap-3">
        <button type="submit" disabled={busy}>
          Confirmar calificación
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
