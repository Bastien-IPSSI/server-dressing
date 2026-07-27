import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabaseUrl } from "./db-url";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl("pooled") });

export const prisma = new PrismaClient({ adapter });
