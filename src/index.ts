import "dotenv/config";
import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { prisma } from "./lib/prisma";
import { authRoutes } from "./routes/auth";
import { clothingRoutes } from "./routes/clothing";

const app = Fastify({ logger: true });

app.register(swagger, {
  openapi: {
    info: {
      title: "server-dressing API",
      version: "1.0.0",
    },
  },
});
app.register(swaggerUi, {
  routePrefix: "/docs",
});

app.get("/health", async () => {
  return { status: "ok" };
});

app.register(authRoutes, { prefix: "/auth" });
app.register(clothingRoutes, { prefix: "/clothing" });

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

async function start() {
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

async function shutdown() {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
