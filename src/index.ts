import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart, { ajvFilePlugin } from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { prisma } from "./lib/prisma";
import { authRoutes } from "./routes/auth";
import { clothingAnalysisRoutes } from "./routes/clothing-analysis";
import { clothingAnalysisRoutes } from "./routes/clothing-analysis";
import { clothingRoutes } from "./routes/clothing";
import { outfitRoutes } from "./routes/outfits";
import { currentOutfitSelectionRoutes } from "./routes/currentOutfitSelection";

const app = Fastify({
  logger: true,
  ajv: {
    plugins: [
      (ajv) => {
        ajvFilePlugin(ajv);
        return ajv;
      },
    ],
  },
});

app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") ?? true,
  credentials: true,
});

const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const localWebOrigins = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];
const corsOrigin = configuredCorsOrigins?.length
  ? configuredCorsOrigins
  : process.env.NODE_ENV === "production"
    ? localWebOrigins
    : true;

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
app.register(cors, {
  origin: corsOrigin,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
app.register(multipart, {
  attachFieldsToBody: true,
  throwFileSizeLimit: true,
});
app.register(cors, {
  origin: corsOrigin,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
app.register(multipart, {
  attachFieldsToBody: true,
  throwFileSizeLimit: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

app.register(authRoutes, { prefix: "/auth" });
app.register(clothingRoutes, { prefix: "/clothing" });
app.register(outfitRoutes, { prefix: "/outfits" });
app.register(clothingAnalysisRoutes, { prefix: "/clothing" });
app.register(currentOutfitSelectionRoutes, { prefix: "/current-outfit-selection" });

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
