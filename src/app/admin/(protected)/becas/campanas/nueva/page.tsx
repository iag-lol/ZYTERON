import { Metadata } from "next";
import CampaignForm from "../_components/campaign-form";

export const metadata: Metadata = {
  title: "Nueva Campaña | Becas Web Pyme",
};

export default function NuevaCampanaPage() {
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crear Nueva Campaña</h1>
      </div>
      <CampaignForm />
    </div>
  );
}
