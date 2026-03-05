import { env } from "@my-better-t-app/env/server";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../prisma/generated/client";

const adapter = new PrismaLibSql({
  url: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
