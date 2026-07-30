import { NextResponse } from "next/server";
import { buildVariables } from "@/lib/commercial/contract-model";
import { generateContractPdf } from "@/lib/commercial/contract-pdf";
import { defaultConfig } from "@/lib/commercial/contracts";
import { CONTRACT_TEMPLATES } from "@/content/commercial-contracts";
import type { CommercialUserAdminView } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const francisca = {
  id: "3f6a1c2e-9b4d-4f8a-b1e2-7c5d8a9f0b31",
  rut: "22144160-5", name: "francisca ignacia díaz lara", email: "FRANCISCA.DIAZ@Gmail.com",
  phone: "912345678", role: "partner", status: "active", commission_pct: 15,
  must_change_password: false, notes: null, internal_notes: null, last_login_at: null,
  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z",
  position: null, contract_type: "partner", started_at: "2026-07-01",
  birth_date: "1998-03-12", address: "aviador acevedo 1234", comuna: "conchali", region: "metropolitana",
  emergency_contact_name: null, emergency_contact_phone: null,
  bank_name: "Banco Estado", bank_account_type: "rut", bank_account_number: "22.144.160-5",
  bank_account_holder: "francisca díaz", bank_account_rut: "22144160-5", payment_email: null,
  goal_monthly_leads: 0, goal_monthly_won: 0, goal_monthly_amount: 0,
} as unknown as CommercialUserAdminView;

function build() {
  const config = { ...defaultConfig(francisca), representativeName: "eduardo ávila", representativeRut: "10123456-8" };
  return { config, variables: buildVariables(francisca, config, "ZY-PT-2026-00001") };
}

export async function GET(req: Request) {
  const { config, variables } = build();
  const caso = new URL(req.url).searchParams.get("case");

  if (caso === "check") {
    const t = CONTRACT_TEMPLATES.partner_agreement;
    const titulos = t.clauses.map((c, i) => `${i + 1}. ${c.title}`);
    const texto = t.clauses.flatMap((c) => c.paragraphs).join(" ");
    return NextResponse.json({
      plantilla: `${t.id} v${t.version}`,
      totalClausulas: t.clauses.length,
      titulos,
      titulosDuplicados: titulos.map((x) => x.split(". ")[1]).filter((x, i, a) => a.indexOf(x) !== i),
      comunicacionesComerciales: t.clauses.findIndex((c) => c.title === "Comunicaciones comerciales") + 1,
      origenDatos: t.clauses.findIndex((c) => c.title === "Origen lícito de los datos") + 1,
      retencionConComa: variables.retencion_vigente,
      terminoIncluyePagosPosteriores: texto.includes("aunque uno o más pagos sean recibidos por Zyteron con posterioridad"),
      tributariaNueva: texto.includes("o el documento tributario que legalmente corresponda"),
    });
  }

  const bytes = await generateContractPdf({ config, variables, contractNumber: "ZY-PT-2026-00001" });
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf" } });
}
