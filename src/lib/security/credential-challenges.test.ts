import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { hash } from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "./secret-crypto";
import { revealCredential as reveal, sendCredentialCodes as send } from "./credential-challenges";
import {
  credentialCodeScope,
  credentialHashesEqual,
  hashCredentialCode,
} from "./credential-challenge-policy";

const sendCredentialCodes = (
  userId: string,
  id: string,
  password = "correct-password",
  binding = "session-a",
) => send(userId, id, password, binding);
const revealCredential = (
  userId: string,
  id: string,
  input: { password: string; code: string; challengeId: string },
  binding = "session-a",
) => reveal(userId, id, input, binding);
type CodeRecord = {
  id: string;
  userId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  consumedAt: Date | null;
  attempts: number;
};
type Where = {
  id?: { in: string[] };
  userId?: string;
  email?: string | { startsWith: string };
  consumedAt?: null;
  expiresAt?: { gt: Date };
  createdAt?: { gte: Date };
  attempts?: { lt: number };
};

describe("credential payment and email authorization", () => {
  let records: CodeRecord[];
  let messages: Array<{ to: string[]; text: string }>;
  let user: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    accountStatus: string;
    emailVerifiedAt: Date | null;
    authProvider: string;
    role: string;
  };
  let credential: {
    id: string;
    userId: string;
    serviceName: string;
    secretCiphertext: string;
    secretIv: string;
    secretTag: string;
    projectId: string | null;
    updatedAt: Date;
  };
  let canonicalPending: boolean;
  let sendAttempts: number;
  let project: {
    id: string;
    clientId: string;
    quoteId: string | null;
    saleId: string | null;
    totalCharge: number;
    quote: null;
    sale: null;
  };
  let debts: Array<{
    clientId: string;
    projectId: string;
    quoteId: null;
    saleId: null;
    totalAmount: number;
    currency: string;
    allocations: Array<{ amount: number }>;
  }>;
  let providerFails: boolean;
  let locks: number;
  const originalTransaction = prisma.$transaction;
  const originalUpdateMany = prisma.emailVerificationCode.updateMany;
  const savedKey = process.env.PORTAL_SECRET_KEY;
  const savedPepper = process.env.PORTAL_CODE_PEPPER;
  const savedResend = process.env.RESEND_API_KEY;

  function matches(record: CodeRecord, where: Where) {
    return (
      (!where.id || where.id.in.includes(record.id)) &&
      (!where.userId || record.userId === where.userId) &&
      (!where.email ||
        (typeof where.email === "string"
          ? record.email === where.email
          : record.email.startsWith(where.email.startsWith))) &&
      (where.consumedAt !== null || record.consumedAt === null) &&
      (!where.expiresAt || record.expiresAt > where.expiresAt.gt) &&
      (!where.createdAt || record.createdAt >= where.createdAt.gte) &&
      (!where.attempts || record.attempts < where.attempts.lt)
    );
  }

  beforeEach(async () => {
    process.env.PORTAL_SECRET_KEY = "test-encryption-key";
    process.env.PORTAL_CODE_PEPPER = "test-code-key";
    process.env.RESEND_API_KEY = "test-provider-key";
    records = [];
    messages = [];
    providerFails = false;
    locks = 0;
    canonicalPending = false;
    sendAttempts = 0;
    user = {
      id: "owner",
      email: "owner@example.com",
      name: "Owner",
      passwordHash: await hash("correct-password", 4),
      accountStatus: "ACTIVE",
      emailVerifiedAt: new Date(),
      authProvider: "LOCAL",
      role: "CLIENT",
    };
    const encrypted = encryptSecret("protected-secret");
    credential = {
      id: "credential-a",
      userId: user.id,
      serviceName: "Service",
      projectId: "project-a",
      updatedAt: new Date("2026-10-01T00:00:00Z"),
      secretCiphertext: encrypted.ciphertext,
      secretIv: encrypted.iv,
      secretTag: encrypted.tag,
    };
    project = {
      id: "project-a",
      clientId: user.id,
      quoteId: null,
      saleId: null,
      totalCharge: 1000,
      quote: null,
      sale: null,
    };
    debts = [
      {
        clientId: user.id,
        projectId: project.id,
        quoteId: null,
        saleId: null,
        totalAmount: 1000,
        currency: "CLP",
        allocations: [{ amount: 1000 }],
      },
    ];
    const tx = {
      project: { findMany: async () => [project] },
      receivable: { findMany: async () => debts },
      clientAuditLog: { count: async () => sendAttempts },
      $queryRaw: async (sql: TemplateStringsArray) => {
        if (!sql.join("?").includes("FOR UPDATE")) return [{ pending: canonicalPending }];
        locks++;
        return [{ id: user.id }];
      },
      user: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === user.id ? user : null,
      },
      clientCredential: {
        findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
          where.id === credential.id && where.userId === credential.userId ? credential : null,
      },
      emailVerificationCode: {
        findMany: async ({ where, take }: { where: Where; take?: number }) =>
          records
            .filter((r) => matches(r, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, take ?? records.length),
        createMany: async ({ data }: { data: CodeRecord[] }) => {
          records.push(
            ...data.map((r) => ({ ...r, attempts: 0, consumedAt: null, createdAt: new Date() })),
          );
          return { count: data.length };
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: Where;
          data: { consumedAt?: Date; attempts?: { increment: number } };
        }) => {
          const found = records.filter((r) => matches(r, where));
          for (const r of found) {
            if (data.consumedAt) r.consumedAt = data.consumedAt;
            if (data.attempts) r.attempts += data.attempts.increment;
          }
          return { count: found.length };
        },
      },
    };
    let queue = Promise.resolve();
    prisma.$transaction = mock.fn(
      (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const next = queue.then(async () => {
          const snapshot = structuredClone(records);
          try {
            return await callback(tx as unknown as Prisma.TransactionClient);
          } catch (error) {
            records = snapshot;
            throw error;
          }
        });
        queue = next.then(
          () => undefined,
          () => undefined,
        );
        return next;
      },
    ) as unknown as typeof prisma.$transaction;
    prisma.emailVerificationCode.updateMany = tx.emailVerificationCode
      .updateMany as unknown as typeof prisma.emailVerificationCode.updateMany;
    mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
      messages.push(JSON.parse(String(init.body)));
      return new Response(
        JSON.stringify(providerFails ? { message: "Unavailable" } : { id: "email" }),
        { status: providerFails ? 500 : 200 },
      );
    });
  });

  afterEach(() => {
    mock.restoreAll();
    prisma.$transaction = originalTransaction;
    prisma.emailVerificationCode.updateMany = originalUpdateMany;
    for (const [key, saved] of [
      ["PORTAL_SECRET_KEY", savedKey],
      ["PORTAL_CODE_PEPPER", savedPepper],
      ["RESEND_API_KEY", savedResend],
    ]) {
      if (saved === undefined) delete process.env[key!];
      else process.env[key!] = saved;
    }
  });

  async function issued() {
    const response = await sendCredentialCodes(user.id, credential.id);
    const code = messages[0].text.match(/Código de seguridad: (\d{6})/)![1];
    assert.ok(!JSON.stringify(response).includes(code));
    return { challengeId: response.challengeId, code, password: "correct-password" };
  }

  it("sends one code only to the verified owner, stores only its hash and consumes it", async () => {
    const input = await issued();
    assert.deepEqual(
      messages.map((m) => m.to),
      [["owner@example.com"]],
    );
    assert.ok(!JSON.stringify(records).includes(input.code));
    assert.equal(records[0].email, credentialCodeScope(credential.id, "owner"));
    assert.equal(
      (await revealCredential(user.id, credential.id, input)).secret,
      "protected-secret",
    );
    assert.ok(records.every((r) => r.consumedAt));
    assert.equal(locks, 2);
  });

  it("rejects wrong codes and commits the failure counter", async () => {
    const input = await issued();
    await assert.rejects(revealCredential(user.id, credential.id, { ...input, code: "invalid" }));
    assert.equal(records[0].attempts, 1);
  });

  it("locks out after five incorrect passwords even with correct codes", async () => {
    const input = await issued();
    for (let i = 0; i < 5; i++)
      await assert.rejects(
        revealCredential(user.id, credential.id, { ...input, password: "wrong" }),
      );
    await assert.rejects(revealCredential(user.id, credential.id, input));
    assert.ok(records.every((r) => r.attempts === 5));
  });

  it("rejects expired challenges and reused codes", async () => {
    const input = await issued();
    await revealCredential(user.id, credential.id, input);
    await assert.rejects(revealCredential(user.id, credential.id, input));
    records.forEach((r) => {
      r.consumedAt = null;
      r.expiresAt = new Date(0);
    });
    await assert.rejects(revealCredential(user.id, credential.id, input));
  });

  it("has no admin bypass for another owner's credentials", async () => {
    const input = await issued();
    user.role = "SUPERADMIN";
    credential.userId = "another-owner";
    await assert.rejects(revealCredential(user.id, credential.id, input));
    await assert.rejects(sendCredentialCodes(user.id, credential.id));
  });

  it("rechecks account status and verified email from the database", async () => {
    const input = await issued();
    user.accountStatus = "DISABLED";
    await assert.rejects(revealCredential(user.id, credential.id, input));
    user.accountStatus = "ACTIVE";
    user.emailVerifiedAt = null;
    await assert.rejects(revealCredential(user.id, credential.id, input));
  });

  it("isolates challenges from login codes and from other credentials", async () => {
    const input = await issued();
    records.forEach((r) => {
      r.email = user.email;
    });
    await assert.rejects(revealCredential(user.id, credential.id, input));
    records[0].email = credentialCodeScope("other-credential", "owner");

    await assert.rejects(revealCredential(user.id, credential.id, input));
  });

  it("permits at most one successful concurrent reveal", async () => {
    const input = await issued();
    const results = await Promise.allSettled([
      revealCredential(user.id, credential.id, input),
      revealCredential(user.id, credential.id, input),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(locks, 3);
  });

  it("invalidates older requests on resend and limits sends across credentials", async () => {
    const first = await issued();
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 429 });
    records.forEach((r) => {
      r.createdAt = new Date(Date.now() - 61_000);
    });
    await issued();
    await assert.rejects(revealCredential(user.id, credential.id, first));
    for (let i = 0; i < 2; i++) {
      records.forEach((r) => {
        r.createdAt = new Date(Date.now() - 61_000);
      });
      await issued();
    }
    records.forEach((r) => {
      r.createdAt = new Date(Date.now() - 61_000);
    });
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 429 });
  });

  it("invalidates the code if its email cannot be sent", async () => {
    providerFails = true;
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 503 });
    assert.ok(records.every((r) => r.consumedAt));
  });

  it("denies sending and revealing when payment is partial, missing or later reversed", async () => {
    debts[0].allocations = [{ amount: 999 }];
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 403 });
    assert.equal(messages.length, 0);
    debts[0].allocations = [{ amount: 1000 }];
    const input = await issued();
    debts[0].allocations = [];
    await assert.rejects(revealCredential(user.id, credential.id, input), { status: 403 });
    assert.equal(records[0].consumedAt, null);
  });
  it("denies unrelated unpaid debt, canonical pending balances and an unlinked project", async () => {
    canonicalPending = true;
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 403 });
    canonicalPending = false;
    credential.projectId = null;
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 403 });
    assert.equal(messages.length, 0);
  });
  it("requires the password before sending and rate limits password guessing", async () => {
    await assert.rejects(sendCredentialCodes(user.id, credential.id, "wrong"), { status: 401 });
    assert.equal(records.length, 0);
    sendAttempts = 11;
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 429 });
    assert.equal(messages.length, 0);
  });
  it("binds codes to the requesting session, email and credential version", async () => {
    const input = await issued();
    await assert.rejects(revealCredential(user.id, credential.id, input, "session-b"));
    user.email = "changed@example.com";
    await assert.rejects(revealCredential(user.id, credential.id, input));
    user.email = "owner@example.com";
    credential.updatedAt = new Date();
    await assert.rejects(revealCredential(user.id, credential.id, input));
  });
  it("binds code hashes to recipient, factor, credential, requester and challenge", () => {
    const base = {
      userId: "owner",
      credentialId: "a",
      challengeId: "request",
      recipient: "owner@example.com",
      factor: "owner" as const,
      code: "123456",
    };
    const expected = hashCredentialCode(base);
    for (const changed of [
      { userId: "other" },
      { credentialId: "b" },
      { challengeId: "other" },
      { recipient: "contacto@zyteron.cl" },
      { factor: "approval" as const },
      { code: "654321" },
    ]) {
      assert.equal(
        credentialHashesEqual(expected, hashCredentialCode({ ...base, ...changed })),
        false,
      );
    }
    assert.equal(credentialHashesEqual(expected, expected), true);
    assert.equal(credentialHashesEqual("broken", expected), false);
  });
});
