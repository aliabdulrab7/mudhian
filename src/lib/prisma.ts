import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; prismaVersion: string };

// Schema version tag — bump this whenever you run `prisma migrate dev`
// to force the singleton to recreate after a schema change in dev.
const SCHEMA_VERSION = "v7_accounting_diamonds";

function createPrisma() {
  // Strip sslmode from the URL so we can set SSL options programmatically.
  // DigitalOcean managed PG uses a self-signed CA; rejectUnauthorized:false
  // keeps the connection encrypted while skipping chain verification.
  const connectionString = (process.env.DATABASE_URL || "").replace(
    /([?&])sslmode=[^&]*/,
    "$1sslmode=no-verify"
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const needsNew = !globalForPrisma.prisma || globalForPrisma.prismaVersion !== SCHEMA_VERSION;
export const prisma = needsNew ? createPrisma() : globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = SCHEMA_VERSION;
}
