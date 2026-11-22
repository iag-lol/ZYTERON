"use client";
import { useAccess } from "./access-context";
import Link from "./routed-link";
import { canAccessGroup, roleProfiles } from "@control/lib/access-control";
import { enterpriseNavigation } from "@control/lib/navigation";
export function TeamHome() {
  const { role } = useAccess();
  return (
    <main className="securityPage">
      <header className="securityHeader">
        <div>
          <p>ZYTERON CONTROL</p>
          <h1>Mi espacio de trabajo</h1>
          <span>
            {roleProfiles.find((item) => item.role === role)?.label || role.replaceAll("_", " ")}
          </span>
        </div>
      </header>
      <section className="securityMetrics">
        {enterpriseNavigation
          .filter((group) => group.id !== "control" && canAccessGroup(role, group.id))
          .map((group) => (
            <Link key={group.id} href={group.items[0]?.href || "/dashboard"}>
              <strong>{group.label}</strong>
              <span>Abrir módulo</span>
            </Link>
          ))}
      </section>
    </main>
  );
}
