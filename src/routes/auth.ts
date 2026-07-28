import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in .env");
}

interface RegisterBody {
  email: string;
  password: string;
  username?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function signToken(userId: bigint): string {
  return jwt.sign({ sub: userId.toString() }, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function serializeUser(user: { id: bigint; email: string; username: string | null }) {
  return { id: user.id.toString(), email: user.email, username: user.username };
}

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    username: { type: ["string", "null"] },
  },
};

const authResponseSchema = {
  type: "object",
  properties: {
    user: userSchema,
    token: { type: "string" },
  },
};

// Forme renvoyée par nos handlers pour les erreurs métier (409, 401, ...)
const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

// Forme par défaut renvoyée par Fastify quand la validation du schéma `body` échoue
const validationErrorSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number" },
    code: { type: "string" },
    error: { type: "string" },
    message: { type: "string" },
  },
};

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>(
    "/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Créer un compte",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            username: { type: "string" },
          },
        },
        response: {
          201: authResponseSchema,
          400: validationErrorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password, username } = request.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: "Un compte existe déjà avec cet email" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash, username },
      });

      const token = signToken(user.id);
      return reply.code(201).send({ user: serializeUser(user), token });
    },
  );

  app.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Se connecter",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        response: {
          200: authResponseSchema,
          400: validationErrorSchema,
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: "Identifiants invalides" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: "Identifiants invalides" });
      }

      const token = signToken(user.id);
      return reply.send({ user: serializeUser(user), token });
    },
  );
}
