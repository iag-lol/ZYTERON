/**
 * Interpreta una respuesta exitosa de Microsoft Graph.
 *
 * Varias acciones de Graph, entre ellas enviar un mensaje, responden 202 o
 * 204 sin cuerpo. Intentar ejecutar response.json() en esos casos convierte
 * un envío ya aceptado por Microsoft en un falso error local.
 */
export async function parseGraphSuccessResponse<T>(response: Response): Promise<T> {
  if (response.status === 202 || response.status === 204) {
    return undefined as T;
  }

  const body = await response.text();
  if (!body.trim()) return undefined as T;

  return JSON.parse(body) as T;
}
