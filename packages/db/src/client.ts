import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  __agentportPrisma: PrismaClient | undefined;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function getPrismaClient(): PrismaClient {
  prismaGlobal.__agentportPrisma ??= new PrismaClient();
  return prismaGlobal.__agentportPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (!prismaGlobal.__agentportPrisma) {
    return;
  }

  await prismaGlobal.__agentportPrisma.$disconnect();
  prismaGlobal.__agentportPrisma = undefined;
}
