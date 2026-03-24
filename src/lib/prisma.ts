import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; prismaVersion: string };

// Schema version tag — bump this whenever you run `prisma migrate dev`
// to force the singleton to recreate after a schema change in dev.
const SCHEMA_VERSION = "v4_employees";

function createPrisma() {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const needsNew = !globalForPrisma.prisma || globalForPrisma.prismaVersion !== SCHEMA_VERSION;
export const prisma = needsNew ? createPrisma() : globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = SCHEMA_VERSION;
}
