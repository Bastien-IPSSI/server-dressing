import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { getDatabaseUrl } from "./db-url.js";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl("pooled") });

export const prisma = new PrismaClient({ adapter });
