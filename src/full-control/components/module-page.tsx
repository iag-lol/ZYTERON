"use client";

import { Boxes, Plus } from "lucide-react";
import { DataTable } from "@control/components/enterprise/data-table";
import { FilterBar } from "@control/components/enterprise/filter-bar";
import { PageHeader } from "@control/components/enterprise/page-header";
import { RoleGuard } from "@control/components/enterprise/access";
import { StatusBadge } from "@control/components/enterprise/status-badge";
import { getModuleDescriptor } from "@control/lib/module-content";

export function ModulePage({ pathname }: { pathname: string }) {
  const module = getModuleDescriptor(pathname);
  return (
    <RoleGuard group={module.group}>
      <main className="modulePage">
        <PageHeader eyebrow={module.group} title={module.title} description={module.description} actions={<button className="pagePrimaryAction" type="button"><Plus size={15} />Nuevo registro</button>} />
        <section className="capabilityGrid">
          {module.capabilities.map((capability) => <article key={capability}><Boxes size={17} /><strong>{capability}</strong><StatusBadge>Preparado</StatusBadge></article>)}
        </section>
        <section className="modulePanel">
          <FilterBar placeholder={`Buscar en ${module.title.toLowerCase()}`} />
          <DataTable columns={["Nombre", "Estado", "Responsable", "Actualizado"]} rows={[]} emptyMessage={module.emptyMessage} />
        </section>
      </main>
    </RoleGuard>
  );
}
