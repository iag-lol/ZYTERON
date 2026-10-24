export const projectNameMessage =
  "Indica el nombre del trabajo o producto, por ejemplo «Sitio web Fenice.cl» o «Diseño de Fleet Control». El nombre de la empresa se registra por separado.";

const key = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function isSpecificProjectName(
  name: string,
  clientNames: readonly (string | null | undefined)[] = [],
) {
  const normalized = key(name),
    subject = normalized.replace(/^(nuevo )?(proyecto|project)( |$)/, "");
  return (
    normalized.length >= 3 &&
    Boolean(subject) &&
    !clientNames.some((client) => client && [normalized, subject].includes(key(client)))
  );
}

export function projectTitleFromServices(services: readonly string[], reference: string) {
  const names = [
    ...new Set(services.map((name) => name.replace(/\s+/g, " ").trim()).filter(Boolean)),
  ];
  if (!names.length) throw new Error(projectNameMessage);
  return `${names.slice(0, 2).join(" / ").slice(0, 120)} · ${reference}`.slice(0, 160);
}
