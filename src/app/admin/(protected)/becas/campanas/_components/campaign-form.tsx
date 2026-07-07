"use client";

import { useState } from "react";
import { saveCampaign } from "../actions";

export default function CampaignForm({ initialData = null }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Convert to datetime-local format: YYYY-MM-DDThh:mm
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await saveCampaign(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else if (res?.success) {
        window.location.href = "/admin/becas/campanas";
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al guardar la campaña.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {initialData && <input type="hidden" name="id" value={initialData.id} />}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Información Básica */}
        <div className="col-span-1 md:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 border-b pb-2">Información Básica</h2>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Título de la Campaña *</label>
          <input required type="text" name="title" defaultValue={initialData?.title} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Slug (URL) *</label>
          <input required type="text" name="slug" defaultValue={initialData?.slug} placeholder="ejemplo-beca-2026" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Subtítulo</label>
          <input type="text" name="subtitle" defaultValue={initialData?.subtitle} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Descripción (Markdown opcional)</label>
          <textarea name="description" rows={4} defaultValue={initialData?.description} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Estado *</label>
          <select name="status" defaultValue={initialData?.status || "draft"} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
            <option value="draft">Borrador</option>
            <option value="scheduled">Programada</option>
            <option value="active">Activa (Postulaciones Abiertas)</option>
            <option value="paused">Pausada</option>
            <option value="closed">Cerrada</option>
            <option value="reviewing">En Revisión</option>
            <option value="winner_pending_acceptance">Ganador Pendiente</option>
            <option value="winner_published">Ganador Publicado</option>
            <option value="archived">Archivada</option>
          </select>
        </div>

        {/* Fechas */}
        <div className="col-span-1 md:col-span-2 mt-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 border-b pb-2">Fechas Importantes</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Inicio Postulaciones</label>
          <input type="datetime-local" name="starts_at" defaultValue={formatDate(initialData?.starts_at)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fin Postulaciones</label>
          <input type="datetime-local" name="ends_at" defaultValue={formatDate(initialData?.ends_at)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Inicio Selección</label>
          <input type="datetime-local" name="selection_starts_at" defaultValue={formatDate(initialData?.selection_starts_at)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fecha Anuncio Ganador</label>
          <input type="datetime-local" name="announcement_at" defaultValue={formatDate(initialData?.announcement_at)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>

        {/* Organizador */}
        <div className="col-span-1 md:col-span-2 mt-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 border-b pb-2">Datos Organizador & Beneficio</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre Legal Organizador</label>
          <input type="text" name="organizer_legal_name" defaultValue={initialData?.organizer_legal_name} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Instagram Oficial (sin @)</label>
          <input type="text" name="official_instagram_handle" defaultValue={initialData?.official_instagram_handle} placeholder="zyteron.cl" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Título del Beneficio</label>
          <input type="text" name="benefit_title" defaultValue={initialData?.benefit_title} placeholder="1 Página Web Profesional" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Valor Referencial (CLP)</label>
          <input type="number" name="benefit_value_clp" defaultValue={initialData?.benefit_value_clp || 0} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-8">
        <a href="/admin/becas/campanas" className="rounded-md border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancelar
        </a>
        <button disabled={loading} type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {loading ? "Guardando..." : "Guardar Campaña"}
        </button>
      </div>
    </form>
  );
}
