import { permanentRedirect } from "next/navigation";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function LegacyPaquetesPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value) params.set(key, value);
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => params.append(key, item));
    }
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  permanentRedirect(`/cotizador${suffix}`);
}
