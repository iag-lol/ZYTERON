import { AccountStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, maskSecret } from "@/lib/security/secret-crypto";

export function currencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export async function getClientPortalSnapshot(userId: string) {
  const emailOwner = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const safeEmail = emailOwner?.email || "";

  const [
    user,
    quotes,
    projects,
    sales,
    taxDocuments,
    documents,
    tickets,
    notifications,
    communications,
    credentials,
    portalRequests,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        phone: true,
        address: true,
        rut: true,
        role: true,
        accountStatus: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.quote.findMany({
      where: safeEmail ? { OR: [{ userId }, { email: { equals: safeEmail } }] } : { userId },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        name: true,
        company: true,
        message: true,
      },
    }),
    prisma.project.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        title: true,
        status: true,
        serviceArea: true,
        priority: true,
        description: true,
        scope: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    }),
    prisma.sale.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        total: true,
        description: true,
        paymentMethod: true,
        invoiceRef: true,
        createdAt: true,
      },
    }),
    prisma.taxDocument.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        type: true,
        documentNumber: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        paymentStatus: true,
        status: true,
        pdfUrl: true,
        createdAt: true,
      },
    }),
    prisma.clientDocument.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        fileName: true,
        fileUrl: true,
        createdAt: true,
      },
    }),
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 120,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            authorRole: true,
            message: true,
            createdAt: true,
            isInternal: true,
          },
        },
      },
    }),
    prisma.clientNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.clientCommunication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.clientCredential.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        project: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.portalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const safeCredentials = credentials.map((cred) => {
    const secret = decryptSecret({
      ciphertext: cred.secretCiphertext,
      iv: cred.secretIv,
      tag: cred.secretTag,
    });
    return {
      id: cred.id,
      project: cred.project,
      serviceName: cred.serviceName,
      username: cred.username,
      secretMasked: secret ? maskSecret(secret) : null,
      url: cred.url,
      notes: cred.notes,
      isSensitive: cred.isSensitive,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    };
  });

  return {
    user,
    quotes,
    projects,
    sales,
    taxDocuments,
    documents,
    tickets,
    notifications,
    communications,
    credentials: safeCredentials,
    portalRequests,
  };
}

export async function getPortalClientsAdminOverview(filters?: {
  search?: string;
  verified?: "yes" | "no" | "all";
  status?: AccountStatus | "all";
  company?: string;
}) {
  const search = String(filters?.search || "").trim();
  const where = {
    role: Role.CLIENT,
    ...(filters?.verified === "yes"
      ? { emailVerifiedAt: { not: null } }
      : filters?.verified === "no"
        ? { emailVerifiedAt: null }
        : {}),
    ...(filters?.status && filters.status !== "all" ? { accountStatus: filters.status } : {}),
    ...(filters?.company ? { company: { contains: filters.company, mode: "insensitive" as const } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      role: true,
      accountStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      _count: {
        select: {
          quotes: true,
          projects: true,
          sales: true,
          documents: true,
          supportTickets: true,
          taxDocuments: true,
        },
      },
    },
    take: 300,
  });

  return users;
}

export async function getPortalAdminClientDetail(clientId: string) {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      phone: true,
      role: true,
      accountStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      notes: true,
      rut: true,
      contactName: true,
      industry: true,
      tier: true,
    },
  });
  if (!user) return null;

  const [quotes, projects, sales, documents, taxDocuments, tickets, credentials, requests, comms, audit] =
    await Promise.all([
      prisma.quote.findMany({ where: { userId: clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.project.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.sale.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.clientDocument.findMany({ where: { userId: clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.taxDocument.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.supportTicket.findMany({
        where: { userId: clientId },
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      }),
      prisma.clientCredential.findMany({
        where: { userId: clientId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { project: { select: { id: true, title: true } } },
      }),
      prisma.portalRequest.findMany({ where: { userId: clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.clientCommunication.findMany({ where: { userId: clientId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.clientAuditLog.findMany({
        where: { targetUserId: clientId },
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
    ]);

  const safeCredentials = credentials.map((cred) => ({
    id: cred.id,
    project: cred.project,
    serviceName: cred.serviceName,
    username: cred.username,
    url: cred.url,
    notes: cred.notes,
    isSensitive: cred.isSensitive,
    hasSecret: Boolean(cred.secretCiphertext),
    createdAt: cred.createdAt,
    updatedAt: cred.updatedAt,
  }));

  return {
    user,
    quotes,
    projects,
    sales,
    documents,
    taxDocuments,
    tickets,
    credentials: safeCredentials,
    requests,
    communications: comms,
    audit,
  };
}
