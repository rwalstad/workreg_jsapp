// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

  // Use Prisma extension instead of $use middleware
  return client.$extends({
    result: {
      $allModels: {
        // This will be applied to all models
      },
    },
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const result = await query(args);
          // Convert BigInt to Number for all queries
          return JSON.parse(
            JSON.stringify(result, (key, value) =>
              typeof value === "bigint" ? Number(value) : value
            )
          );
        },
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export { prisma };
export default prisma;