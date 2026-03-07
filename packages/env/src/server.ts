import dotenv from "dotenv";
import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Support both running from workspace root and from apps/web.
dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
  quiet: true,
});

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
  quiet: true,
});

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
