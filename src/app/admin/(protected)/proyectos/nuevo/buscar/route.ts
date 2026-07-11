import { NextResponse } from "next/server";
import { getClientById, getClients, getQuotes, getSales } from "@/lib/admin/repository";

/**
 * Búsqueda para el formulario de proyectos:
 * - GET ?q=texto      → clientes que calzan por nombre, email, empresa o RUT.
 * - GET ?clientId=id  → ficha del cliente + sus cotizaciones y ventas, para
 *   autocompletar los IDs sin tener que pegarlos a mano.
 */

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId")?.trim();
  const q = searchParams.get("q")?.trim();

  try {
    if (clientId) {
      const client = await getClientById(clientId);
      if (!client) {
        return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
      }

      const [quotes, sales] = await Promise.all([getQuotes(), getSales()]);
      const clientEmail = normalize(client.email);

      return NextResponse.json({
        client: {
          id: client.id,
          name: client.name,
          email: client.email ?? null,
          company: client.company ?? null,
          phone: client.phone ?? null,
          rut: client.rut ?? null,
          city: client.city ?? null,
        },
        quotes: quotes
          .filter(
            (quote) =>
              quote.userId === client.id ||
              (clientEmail !== "" && normalize(quote.email) === clientEmail),
          )
          .slice(0, 25)
          .map((quote) => ({
            id: quote.id,
            total: quote.total ?? 0,
            status: quote.status ?? null,
            createdAt: quote.createdAt ?? null,
          })),
        sales: sales
          .filter((sale) => sale.clientId === client.id)
          .slice(0, 25)
          .map((sale) => ({
            id: sale.id,
            total: sale.total ?? 0,
            description: sale.description ?? null,
            invoiceRef: sale.invoiceRef ?? null,
            createdAt: sale.createdAt ?? null,
          })),
      });
    }

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [] });
    }

    const needle = normalize(q);
    const clients = (await getClients())
      .filter((client) =>
        [client.name, client.email, client.company, client.rut, client.contactName].some(
          (field) => normalize(field).includes(needle),
        ),
      )
      .slice(0, 8)
      .map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email ?? null,
        company: client.company ?? null,
        rut: client.rut ?? null,
      }));

    return NextResponse.json({ clients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo buscar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
