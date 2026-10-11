export async function limitedJson(req: Request, maximum = 4096): Promise<unknown> {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("REQUEST_FORMAT_INVALID");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("REQUEST_BODY_REQUIRED");
  let text = "",
    size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > maximum) throw new Error("REQUEST_BODY_LIMIT");
      text += decoder.decode(r.value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(text);
}
