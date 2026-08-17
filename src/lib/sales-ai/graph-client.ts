import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "./crypto";

/**
 * Cliente de Microsoft Graph para el buzón comercial de Zara.
 * Los tokens viven cifrados en sales_mail_account y se renuevan solos.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const ACCOUNT_ID = "default";

export const GRAPH_SCOPES = [
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Mail.ReadWrite",
].join(" ");

export type GraphConfig = {
  clientId: string;
  tenantId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGraphConfig(): GraphConfig | null {
  const clientId = process.env.MS_GRAPH_CLIENT_ID?.trim();
  const tenantId = process.env.MS_GRAPH_TENANT_ID?.trim();
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MS_GRAPH_REDIRECT_URI?.trim();

  if (!clientId || !tenantId || !clientSecret || !redirectUri) return null;
  return { clientId, tenantId, clientSecret, redirectUri };
}

export function isGraphConfigured(): boolean {
  return Boolean(getGraphConfig()) && isEncryptionConfigured();
}

function tokenEndpoint(tenantId: string) {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function buildAuthorizeUrl(state: string): string | null {
  const config = getGraphConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: GRAPH_SCOPES,
    state,
    prompt: "select_account",
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const config = getGraphConfig();
  if (!config) throw new Error("Microsoft Graph no está configurado en el servidor.");

  const response = await fetch(tokenEndpoint(config.tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Microsoft rechazó la solicitud de token (${response.status}): ${detail.slice(0, 300)}`);
  }

  return (await response.json()) as TokenResponse;
}

export type MailAccount = {
  id: string;
  user_principal_name: string | null;
  display_name: string | null;
  token_expires_at: string | null;
  subscription_id: string | null;
  subscription_expires_at: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

export async function getMailAccount(): Promise<MailAccount | null> {
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_mail_account")
      .select("id, user_principal_name, display_name, token_expires_at, subscription_id, subscription_expires_at, connected_at, last_sync_at, last_error")
      .eq("id", ACCOUNT_ID)
      .maybeSingle();
    return (data as MailAccount) ?? null;
  } catch {
    return null;
  }
}

/** Intercambia el código de autorización por tokens y deja la cuenta conectada. */
export async function completeAuthorization(code: string): Promise<{ email: string; name: string }> {
  const config = getGraphConfig();
  if (!config) throw new Error("Microsoft Graph no está configurado.");

  const tokens = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    scope: GRAPH_SCOPES,
  });

  const profileRes = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok
    ? ((await profileRes.json()) as { mail?: string; userPrincipalName?: string; displayName?: string })
    : {};

  const email = profile.mail || profile.userPrincipalName || "";
  const name = profile.displayName || "";

  const { supabase } = createSupabaseServerClient();
  await supabase.from("sales_mail_account").upsert({
    id: ACCOUNT_ID,
    user_principal_name: email,
    display_name: name,
    access_token_encrypted: encryptSecret(tokens.access_token),
    refresh_token_encrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
    token_expires_at: new Date(Date.now() + (tokens.expires_in - 120) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  });

  return { email, name };
}

/**
 * Devuelve un access token válido, renovándolo con el refresh token si expiró.
 * Nunca expone el token fuera del servidor.
 */
export async function getAccessToken(): Promise<string> {
  const { supabase } = createSupabaseServerClient();
  const { data } = await supabase
    .from("sales_mail_account")
    .select("access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("id", ACCOUNT_ID)
    .maybeSingle();

  if (!data?.access_token_encrypted) {
    throw new Error("El buzón de Zara no está conectado con Microsoft.");
  }

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now()) {
    return decryptSecret(data.access_token_encrypted);
  }

  if (!data.refresh_token_encrypted) {
    throw new Error("El acceso a Microsoft expiró y no hay refresh token. Vuelve a conectar el buzón.");
  }

  const tokens = await requestToken({
    grant_type: "refresh_token",
    refresh_token: decryptSecret(data.refresh_token_encrypted),
    scope: GRAPH_SCOPES,
  });

  await supabase
    .from("sales_mail_account")
    .update({
      access_token_encrypted: encryptSecret(tokens.access_token),
      ...(tokens.refresh_token
        ? { refresh_token_encrypted: encryptSecret(tokens.refresh_token) }
        : {}),
      token_expires_at: new Date(Date.now() + (tokens.expires_in - 120) * 1000).toISOString(),
      last_error: null,
    })
    .eq("id", ACCOUNT_ID);

  return tokens.access_token;
}

export async function recordMailError(message: string) {
  try {
    const { supabase } = createSupabaseServerClient();
    await supabase
      .from("sales_mail_account")
      .update({ last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", ACCOUNT_ID);
  } catch {
    // best-effort
  }
}

export async function graphFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = `Graph ${response.status} en ${path}: ${detail.slice(0, 300)}`;
    await recordMailError(message);
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------

export type GraphMessage = {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
  ccRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
  receivedDateTime?: string;
  sentDateTime?: string;
  hasAttachments?: boolean;
  isDraft?: boolean;
};

export async function getMessage(messageId: string): Promise<GraphMessage> {
  const fields =
    "id,conversationId,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,hasAttachments,isDraft";
  return graphFetch<GraphMessage>(`/me/messages/${encodeURIComponent(messageId)}?$select=${fields}`);
}

/** Últimos mensajes de una conversación, para dar contexto al redactar. */
export async function getConversationMessages(conversationId: string, top = 10): Promise<GraphMessage[]> {
  const filter = encodeURIComponent(`conversationId eq '${conversationId}'`);
  const data = await graphFetch<{ value: GraphMessage[] }>(
    `/me/messages?$filter=${filter}&$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,receivedDateTime`,
  );
  return data.value ?? [];
}

export type SendMailInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  saveToSentItems?: boolean;
};

function toRecipients(addresses: string[] = []) {
  return addresses.filter(Boolean).map((address) => ({ emailAddress: { address } }));
}

/**
 * Envía un correo nuevo. Devuelve el mensaje creado para poder guardar los IDs
 * reales de Microsoft: Graph no los devuelve en /sendMail, así que creamos el
 * borrador y lo enviamos, que sí deja el mensaje identificable.
 */
export async function sendNewMail(input: SendMailInput): Promise<GraphMessage> {
  const draft = await graphFetch<GraphMessage>("/me/messages", {
    method: "POST",
    body: JSON.stringify({
      subject: input.subject,
      body: { contentType: input.isHtml ? "HTML" : "Text", content: input.body },
      toRecipients: toRecipients(input.to),
      ...(input.cc?.length ? { ccRecipients: toRecipients(input.cc) } : {}),
    }),
  });

  await graphFetch<void>(`/me/messages/${encodeURIComponent(draft.id)}/send`, { method: "POST" });
  return draft;
}

/**
 * Responde dentro del hilo existente. Es lo que mantiene la conversación en
 * Outlook: crea el borrador de respuesta sobre el mensaje original, conserva
 * asunto, participantes y conversationId, y luego lo envía.
 */
export async function replyInThread(input: {
  messageId: string;
  body: string;
  isHtml?: boolean;
  replyAll?: boolean;
}): Promise<GraphMessage> {
  const action = input.replyAll ? "createReplyAll" : "createReply";

  const draft = await graphFetch<GraphMessage>(
    `/me/messages/${encodeURIComponent(input.messageId)}/${action}`,
    { method: "POST", body: JSON.stringify({}) },
  );

  await graphFetch<void>(`/me/messages/${encodeURIComponent(draft.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      body: { contentType: input.isHtml ? "HTML" : "Text", content: input.body },
    }),
  });

  await graphFetch<void>(`/me/messages/${encodeURIComponent(draft.id)}/send`, { method: "POST" });
  return draft;
}

// ---------------------------------------------------------------------------
// Suscripciones (webhooks)
// ---------------------------------------------------------------------------

export type GraphSubscription = {
  id: string;
  expirationDateTime: string;
  resource: string;
};

/** Microsoft limita las suscripciones de correo a ~3 días. Pedimos algo menos. */
const SUBSCRIPTION_MINUTES = 4230; // ~70 horas

export async function createSubscription(notificationUrl: string, clientState: string) {
  const expiration = new Date(Date.now() + SUBSCRIPTION_MINUTES * 60 * 1000).toISOString();

  const subscription = await graphFetch<GraphSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      changeType: "created",
      notificationUrl,
      resource: "/me/mailFolders('Inbox')/messages",
      expirationDateTime: expiration,
      clientState,
    }),
  });

  const { supabase } = createSupabaseServerClient();
  await supabase
    .from("sales_mail_account")
    .update({
      subscription_id: subscription.id,
      subscription_expires_at: subscription.expirationDateTime,
      last_error: null,
    })
    .eq("id", ACCOUNT_ID);

  return subscription;
}

export async function renewSubscription(subscriptionId: string) {
  const expiration = new Date(Date.now() + SUBSCRIPTION_MINUTES * 60 * 1000).toISOString();

  const subscription = await graphFetch<GraphSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "PATCH", body: JSON.stringify({ expirationDateTime: expiration }) },
  );

  const { supabase } = createSupabaseServerClient();
  await supabase
    .from("sales_mail_account")
    .update({
      subscription_expires_at: subscription.expirationDateTime,
      last_error: null,
    })
    .eq("id", ACCOUNT_ID);

  return subscription;
}

export async function deleteSubscription(subscriptionId: string) {
  await graphFetch<void>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "DELETE" });
  const { supabase } = createSupabaseServerClient();
  await supabase
    .from("sales_mail_account")
    .update({ subscription_id: null, subscription_expires_at: null })
    .eq("id", ACCOUNT_ID);
}
