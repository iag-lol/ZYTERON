import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { hash } from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "./secret-crypto";
import { revealCredential, sendCredentialCodes } from "./credential-challenges";
import {
  credentialCodeScope,
  credentialHashesEqual,
  hashCredentialCode,
} from "./credential-challenge-policy";

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

describe("credential dual authorization", () => {
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
  };
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
      secretCiphertext: encrypted.ciphertext,
      secretIv: encrypted.iv,
      secretTag: encrypted.tag,
    };
    const tx = {
      $queryRaw: async (sql: TemplateStringsArray) => {
        assert.match(sql.join("?"), /FOR UPDATE/);
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
    const approvalCode = messages[1].text.match(/Código de seguridad: (\d{6})/)![1];
    return { challengeId: response.challengeId, code, approvalCode, password: "correct-password" };
  }

  it("sends different codes separately and reveals only after both validations", async () => {
    const input = await issued();
    assert.deepEqual(
      messages.map((m) => m.to),
      [["owner@example.com"], ["contacto@zyteron.cl"]],
    );
    assert.notEqual(input.code, input.approvalCode);
    assert.ok(!messages[0].text.includes(input.approvalCode));
    assert.ok(!JSON.stringify(records).includes(input.code));
    assert.equal(records[0].email, credentialCodeScope(credential.id, "owner"));
    assert.equal(
      (await revealCredential(user.id, credential.id, input)).secret,
      "protected-secret",
    );
    assert.ok(records.every((r) => r.consumedAt));
    assert.equal(locks, 2);
  });

  it("rejects a missing or wrong second code and commits failure counters", async () => {
    const input = await issued();
    await assert.rejects(revealCredential(user.id, credential.id, { ...input, approvalCode: "" }));
    await assert.rejects(
      revealCredential(user.id, credential.id, { ...input, approvalCode: input.code }),
    );
    assert.ok(records.every((r) => r.attempts === 2 && !r.consumedAt));
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
    records[1].email = credentialCodeScope("other-credential", "approval");
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

  it("invalidates both codes if either email cannot be sent", async () => {
    providerFails = true;
    await assert.rejects(sendCredentialCodes(user.id, credential.id), { status: 503 });
    assert.ok(records.every((r) => r.consumedAt));
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
