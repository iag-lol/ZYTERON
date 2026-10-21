import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  checkMediaBytes,
  checkMediaFile,
  DOCUMENT_LIMIT,
  IMAGE_LIMIT,
  MediaError,
  readBoundedBody,
} from "./media-policy";
import { createMetaMediaClient, MetaMediaError, trustedMediaUrl } from "./meta-media";
import { createMediaHandlers } from "./media-handlers";
import {
  sendMedia,
  type MediaInput,
  type MediaRecord,
  type MediaRepository,
} from "./media-workflow";

const conversationId = "00000000-0000-4000-8000-000000000001";
const otherConversation = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000010";
const messageId = "00000000-0000-4000-8000-000000000020";
const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n");
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  ),
);
function fixture() {
  const rows = new Map<string, MediaRecord>();
  const calls = { uploads: 0, sends: 0, touches: 0, reads: 0, metaDownloads: 0 };
  let conversation = {
    id: conversationId,
    phone: "56900000001",
    window_expires_at: new Date(Date.now() + 3600000).toISOString(),
  };
  const repo: MediaRepository = {
    async conversation(id) {
      calls.reads++;
      return id === conversationId ? { ...conversation } : null;
    },
    async claim(input, hash) {
      const existing = rows.get(input.requestId);
      if (existing) return { record: { ...existing }, created: false };
      const record: MediaRecord = {
        id: messageId,
        conversation_id: input.conversationId,
        status: "sending",
        request_hash: hash,
        media_id: null,
        mime_type: input.file.type,
        file_name: input.file.name,
        message_type: input.file.type.startsWith("image/") ? "image" : "document",
        content: input.caption,
      };
      rows.set(input.requestId, record);
      return { record: { ...record }, created: true };
    },
    async patch(id, patch, onlySending) {
      const row = [...rows.values()].find((r) => r.id === id);
      if (!row) throw Error("missing");
      if (!onlySending || row.status === "sending") Object.assign(row, patch);
    },
    async touch() {
      calls.touches++;
    },
    async message(conv, id) {
      return [...rows.values()].find((r) => r.id === id && r.conversation_id === conv) || null;
    },
  };
  const meta = {
    async upload() {
      calls.uploads++;
      return "123456789";
    },
    async send() {
      calls.sends++;
      return "wamid.synthetic";
    },
    async download() {
      calls.metaDownloads++;
      return { bytes: pdf, mime: "application/pdf" as const };
    },
  };
  const input: MediaInput = {
    conversationId,
    requestId,
    caption: "Documento de prueba",
    actorId: "admin-test",
    file: new File([pdf], "propuesta.pdf", { type: "application/pdf" }),
    bytes: pdf,
  };
  return {
    rows,
    calls,
    repo,
    meta,
    input,
    expire: () => {
      conversation = {
        ...conversation,
        window_expires_at: new Date(Date.now() - 1000).toISOString(),
      };
    },
  };
}
function request(input: MediaInput) {
  const form = new FormData();
  form.set("file", input.file);
  form.set("caption", input.caption);
  form.set("conversationId", input.conversationId);
  form.set("requestId", input.requestId);
  return new Request("https://example.invalid/api/admin/whatsapp/media", {
    method: "POST",
    body: form,
  });
}
function handlers(f: ReturnType<typeof fixture>, allowed = true) {
  return createMediaHandlers({
    authorize: async () =>
      allowed
        ? { actorId: "admin-test" }
        : { error: Response.json({ error: "No autorizado." }, { status: 403 }) },
    repository: () => f.repo,
    meta: () => f.meta,
  });
}

test("uploads JPEG/PNG and PDF only, rejects forged types and oversized files", () => {
  checkMediaBytes(pdf, "application/pdf");
  checkMediaBytes(png, "image/png");
  assert.throws(() => checkMediaBytes(pdf, "image/png"), MediaError);
  assert.throws(
    () => checkMediaFile({ type: "image/svg+xml", name: "x.svg", size: 50 }),
    MediaError,
  );
  assert.throws(
    () => checkMediaFile({ type: "application/pdf", name: "x.html", size: 50 }),
    MediaError,
  );
  assert.throws(
    () => checkMediaFile({ type: "application/pdf", name: "x.pdf", size: 0 }),
    MediaError,
  );
  assert.throws(
    () => checkMediaFile({ type: "application/pdf", name: "x.pdf", size: DOCUMENT_LIMIT + 1 }),
    MediaError,
  );
  assert.throws(
    () => checkMediaFile({ type: "image/png", name: "x.png", size: IMAGE_LIMIT + 1 }),
    MediaError,
  );
});
test("bounded reads cancel a stream even without Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(30));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readBoundedBody(stream, 10), { status: 413 });
  assert.equal(cancelled, true);
});
test("simultaneous double click and repeated requests send the original message once", async () => {
  const f = fixture();
  const results = await Promise.all(
    Array.from({ length: 12 }, () => sendMedia(f.input, f.repo, f.meta)),
  );
  assert.equal(f.calls.uploads, 1);
  assert.equal(f.calls.sends, 1);
  assert.equal(f.rows.size, 1);
  assert.equal(results.filter((r) => r.ok).length >= 1, true);
  const retry = await sendMedia(f.input, f.repo, f.meta);
  assert.equal(retry.ok, true);
  assert.equal(f.calls.sends, 1);
});
test("request key cannot be reused with another caption, file or actor", async () => {
  const f = fixture();
  await sendMedia(f.input, f.repo, f.meta);
  for (const changed of [
    { caption: "Otro texto" },
    { actorId: "other-admin" },
    { bytes: png, file: new File([png], "foto.png", { type: "image/png" }) },
  ])
    await assert.rejects(sendMedia({ ...f.input, ...changed }, f.repo, f.meta), { status: 409 });
  assert.equal(f.calls.sends, 1);
});
test("missing conversation never creates or sends a message", async () => {
  const f = fixture();
  await assert.rejects(
    sendMedia({ ...f.input, conversationId: otherConversation }, f.repo, f.meta),
    { status: 404 },
  );
  assert.equal(f.rows.size, 0);
  assert.equal(f.calls.sends, 0);
});
test("closed window and a window expiring during upload prevent delivery", async () => {
  const closed = fixture();
  closed.expire();
  assert.equal((await sendMedia(closed.input, closed.repo, closed.meta)).status, "failed");
  assert.equal(closed.calls.uploads, 0);
  const f = fixture();
  f.meta.upload = async () => {
    f.expire();
    return "123456789";
  };
  const result = await sendMedia(f.input, f.repo, f.meta);
  assert.equal(result.ok, false);
  assert.equal(f.calls.sends, 0);
});
test("rechecking an already sent message works after the 24 hour window closes", async () => {
  const f = fixture();
  await sendMedia(f.input, f.repo, f.meta);
  f.expire();
  assert.equal((await sendMedia(f.input, f.repo, f.meta)).ok, true);
  assert.equal(f.calls.sends, 1);
});
test("an upload failure never reaches the customer and stays traceable", async () => {
  const f = fixture();
  f.meta.upload = async () => {
    throw Error("network");
  };
  assert.equal((await sendMedia(f.input, f.repo, f.meta)).status, "failed");
  assert.equal(f.calls.sends, 0);
  assert.equal(f.rows.size, 1);
});
test("an ambiguous delivery is unknown and retries cannot send it again", async () => {
  const f = fixture();
  f.meta.send = async () => {
    f.calls.sends++;
    throw new MetaMediaError("timeout", false);
  };
  assert.equal((await sendMedia(f.input, f.repo, f.meta)).status, "unknown");
  assert.equal((await sendMedia(f.input, f.repo, f.meta)).status, "unknown");
  assert.equal(f.calls.sends, 1);
});
test("a definitive provider rejection is failed and never reported as sent", async () => {
  const f = fixture();
  f.meta.send = async () => {
    throw new MetaMediaError("WhatsApp rechazó la operación.", true);
  };
  const result = await sendMedia(f.input, f.repo, f.meta);
  assert.equal(result.status, "failed");
  assert.equal(result.ok, false);
});
test("a confirmed send is not reported failed if the conversation summary fails", async () => {
  const f = fixture();
  f.repo.touch = async () => {
    throw Error("unavailable");
  };
  assert.equal((await sendMedia(f.input, f.repo, f.meta)).ok, true);
});
test("a persistence failure after delivery cannot cause another delivery", async () => {
  const f = fixture(),
    patch = f.repo.patch;
  f.repo.patch = async (id, change, onlySending) => {
    if (change.status === "sent") throw Error("db");
    await patch(id, change, onlySending);
  };
  assert.equal((await sendMedia(f.input, f.repo, f.meta)).status, "unknown");
  await sendMedia(f.input, f.repo, f.meta);
  assert.equal(f.calls.sends, 1);
});
test("finalization preserves a newer delivered/read webhook state", async () => {
  const f = fixture();
  f.meta.send = async () => {
    await f.repo.patch(messageId, { status: "read", meta_message_id: "wamid.synthetic" });
    return "wamid.synthetic";
  };
  await sendMedia(f.input, f.repo, f.meta);
  assert.equal(f.rows.get(requestId)?.status, "read");
});
test("authentication denial prevents reads, uploads and body consumption", async () => {
  const f = fixture(),
    h = handlers(f, false);
  const response = await h.POST(request(f.input));
  assert.equal(response.status, 403);
  const download = await h.GET(
    new Request(`https://example.invalid/media?conversationId=${conversationId}`),
    messageId,
  );
  assert.equal(download.status, 403);
  assert.equal(f.calls.reads, 0);
  assert.equal(f.calls.sends, 0);
  assert.equal(f.calls.metaDownloads, 0);
});
test("invalid IDs and a message from another conversation cannot retrieve any bytes", async () => {
  const f = fixture(),
    h = handlers(f);
  await sendMedia(f.input, f.repo, f.meta);
  assert.equal(
    (
      await h.GET(
        new Request(`https://example.invalid/media?conversationId=${conversationId}`),
        "../../secrets",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await h.GET(
        new Request(`https://example.invalid/media?conversationId=${otherConversation}`),
        messageId,
      )
    ).status,
    404,
  );
  assert.equal(f.calls.metaDownloads, 0);
});
test("authenticated media returns exact bytes with private headers and download name", async () => {
  const f = fixture(),
    h = handlers(f);
  await sendMedia(f.input, f.repo, f.meta);
  const response = await h.GET(
    new Request(`https://example.invalid/media?conversationId=${conversationId}&download=1`),
    messageId,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), pdf);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-disposition") || "", /^attachment;.*propuesta.pdf/);
});
test("existing media failure remains explicit and never requests a replacement upload", async () => {
  const f = fixture(),
    h = handlers(f);
  await sendMedia(f.input, f.repo, f.meta);
  f.meta.download = async () => {
    throw new MediaError("WhatsApp no permite recuperar este archivo ahora.", 502);
  };
  const response = await h.GET(
    new Request(`https://example.invalid/media?conversationId=${conversationId}`),
    messageId,
  );
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /recuperar/);
  assert.equal(f.calls.uploads, 1);
});
test("multipart endpoint rejects invalid IDs, empty lists and multiple files", async () => {
  const f = fixture(),
    h = handlers(f);
  assert.equal((await h.POST(request({ ...f.input, conversationId: "invalid" }))).status, 400);
  const form = new FormData();
  form.set("conversationId", conversationId);
  form.set("requestId", requestId);
  form.set("caption", "");
  form.append("file", f.input.file);
  form.append("file", f.input.file);
  assert.equal(
    (await h.POST(new Request("https://example.invalid/media", { method: "POST", body: form })))
      .status,
    400,
  );
  assert.equal(
    (
      await h.POST(
        new Request("https://example.invalid/media", { method: "POST", body: new FormData() }),
      )
    ).status,
    400,
  );
  assert.equal(f.calls.sends, 0);
});
test("multipart upload persists and retrieves a real synthetic image", async () => {
  const f = fixture(),
    h = handlers(f);
  f.input.file = new File([png], "foto.png", { type: "image/png" });
  f.input.bytes = png;
  f.meta.download = async () => {
    f.calls.metaDownloads++;
    return { bytes: png, mime: "image/png" as "application/pdf" };
  };
  assert.equal((await h.POST(request(f.input))).status, 200);
  const response = await h.GET(
    new Request(`https://example.invalid/media?conversationId=${conversationId}`),
    messageId,
  );
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), png);
});
test("provider tokens can only be sent to Meta graph and the exact media host/path", async () => {
  for (const url of [
    "http://lookaside.fbsbx.com/whatsapp_business/attachments/a",
    "https://lookaside.fbsbx.com.evil.invalid/whatsapp_business/attachments/a",
    "https://evil.invalid/a",
    "https://lookaside.fbsbx.com/other/a",
    "https://user@lookaside.fbsbx.com/whatsapp_business/attachments/a",
    "https://lookaside.fbsbx.com:444/whatsapp_business/attachments/a",
  ])
    assert.throws(() => trustedMediaUrl(url), MediaError);
  let calls = 0;
  const meta = createMetaMediaClient({
    token: "synthetic-token",
    phoneId: "123456789",
    fetch: async () => {
      calls++;
      return Response.json({ url: "https://evil.invalid/a", mime_type: "application/pdf" });
    },
  });
  await assert.rejects(meta.download("123456789"), MediaError);
  assert.equal(calls, 1);
});
test("provider upload and send use uploaded media ID and correct document metadata", async () => {
  const seen: Request[] = [];
  const meta = createMetaMediaClient({
    token: "synthetic-token",
    phoneId: "123456789",
    fetch: async (url, init) => {
      seen.push(new Request(url, init));
      return Response.json(
        seen.length === 1 ? { id: "987654321" } : { messages: [{ id: "wamid.synthetic" }] },
      );
    },
  });
  const id = await meta.upload(pdf, "application/pdf", "propuesta.pdf");
  assert.equal((await seen[0].formData()).get("messaging_product"), "whatsapp");
  await meta.send("56900000001", id, "application/pdf", "propuesta.pdf", "Adjunto");
  assert.equal(seen[1].headers.get("authorization"), "Bearer synthetic-token");
  assert.deepEqual((await seen[1].json()).document, {
    id: "987654321",
    filename: "propuesta.pdf",
    caption: "Adjunto",
  });
});
test("fresh metadata URLs are fetched privately; hashes, redirects and byte types are checked", async () => {
  const urls: string[] = [];
  const meta = createMetaMediaClient({
    token: "synthetic-token",
    phoneId: "123456789",
    fetch: async (url, init) => {
      urls.push(String(url));
      assert.equal(init?.redirect, "error");
      return urls.length % 2
        ? Response.json({
            url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?token=synthetic",
            mime_type: "application/pdf",
            sha256: createHash("sha256").update(pdf).digest("base64"),
          })
        : new Response(pdf);
    },
  });
  assert.deepEqual((await meta.download("987654321")).bytes, pdf);
  await meta.download("987654321");
  assert.equal(urls.length, 4);
  assert.match(urls[0], /phone_number_id=123456789/);
  const bad = createMetaMediaClient({
    token: "synthetic-token",
    phoneId: "123456789",
    fetch: async (url) =>
      String(url).includes("graph.facebook.com")
        ? Response.json({
            url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/a",
            mime_type: "image/png",
          })
        : new Response(pdf),
  });
  await assert.rejects(bad.download("987654321"), MediaError);
});

test("a stalled upload is cancelled within the read deadline", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readBoundedBody(stream, 30, 5), { status: 408 });
  assert.equal(cancelled, true);
});
test("a provider file with different registered MIME cannot be exposed through the message", async () => {
  const f = fixture(),
    h = handlers(f);
  await sendMedia(f.input, f.repo, f.meta);
  f.rows.get(requestId)!.mime_type = "image/png";
  assert.equal(
    (
      await h.GET(
        new Request(`https://example.invalid/media?conversationId=${conversationId}`),
        messageId,
      )
    ).status,
    502,
  );
});
test("a file with invalid integrity is rejected instead of returned as a successful download", async () => {
  const meta = createMetaMediaClient({
    token: "synthetic-token",
    phoneId: "123456789",
    fetch: async (url) =>
      String(url).includes("graph.facebook.com")
        ? Response.json({
            url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/a",
            mime_type: "application/pdf",
            sha256: "wrong-hash",
          })
        : new Response(pdf),
  });
  await assert.rejects(meta.download("987654321"), { status: 502 });
});
