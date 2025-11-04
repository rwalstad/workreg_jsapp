// Middleware Solution
// ✅ Automatic: Works for all Prisma queries (not just /api/user).
// ✅ Cleaner Code: No need to manually handle BigInt in every API function.
// ✅ Scalable: Works across all your API routes.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Middleware to convert BigInt to Number for all queries
prisma.$use(async (params, next) => {
  const result = await next(params);
  return JSON.parse(
    JSON.stringify(result, (key, value) => (typeof value === "bigint" ? Number(value) : value))
  );
});

export default prisma;
