import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart, { ajvFilePlugin } from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { clothingAnalysisRoutes } from "./routes/clothing-analysis.js";
import { clothingRoutes } from "./routes/clothing.js";
import { outfitRoutes } from "./routes/outfits.js";
import { currentOutfitSelectionRoutes } from "./routes/currentOutfitSelection.js";

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

const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = configuredCorsOrigins?.length
  ? configuredCorsOrigins
  : process.env.NODE_ENV === "production"
    ? false
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
  allowedHeaders: ["Content-Type", "Cookie", "Expo-Origin", "X-Skip-OAuth-Proxy"],
  credentials: true,
  maxAge: 86400,
});
app.register(multipart, {
  attachFieldsToBody: true,
  throwFileSizeLimit: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

app.register(authRoutes);
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
