import { env } from "@my-better-t-app/env/server";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hackVercelForDemo } from "./hack_vercel_for_demo";

import { PrismaClient } from "../prisma/generated/client";

const adapter = new PrismaLibSql({
  url: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

await hackVercelForDemo(prisma, env.DATABASE_URL);

export default prisma;
