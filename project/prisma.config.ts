import { config } from "dotenv";
config({ path: "apps/content/.env" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: (process.env.DATABASE_URL ?? 'postgresql://readme:readme_password@localhost:5433/readme_content?schema=public'),
  },
});
