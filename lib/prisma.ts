import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

function createClient(): any {
  if (!process.env.DATABASE_URL) {
    const { createMockPrisma } = require("./mock-db");
    return createMockPrisma();
  }

  const { PrismaClient: RealPrismaClient } = require("@prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const pg = require("pg");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  return new RealPrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

let initialized = false;

const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient();
      if (!initialized) {
        initialized = true;
        if (!process.env.DATABASE_URL) {
          console.log("[Mock Mode] Running without database — all data is in-memory");
        }
      }
    }
    return globalForPrisma.prisma[prop];
  },
});

export { prisma };
export default prisma;
