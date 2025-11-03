// prisma.config.ts
import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config(); // <-- explicitly load your .env

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

console.log('Prisma config loaded. Database URL:', process.env.DATABASE_URL);