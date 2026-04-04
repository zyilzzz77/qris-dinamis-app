import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // env() throws if missing, so use process.env fallback for smoother deploys.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
