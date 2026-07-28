import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { verifyGoogleIdToken } from "../lib/google";

interface RegisterBody {
  email: string;
  password: string;
  username?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface GoogleBody {
  idToken: string;
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
      if (!user || !user.passwordHash) {
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

  app.post<{ Body: GoogleBody }>(
    "/google",
    {
      schema: {
        tags: ["Auth"],
        summary: "Se connecter / s'inscrire avec Google",
        body: {
          type: "object",
          required: ["idToken"],
          properties: {
            idToken: { type: "string" },
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
      const { idToken } = request.body;

      let profile;
      try {
        profile = await verifyGoogleIdToken(idToken);
      } catch {
        return reply.code(401).send({ error: "Token Google invalide" });
      }

      // Compte déjà lié à ce Google ID
      let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

      // Compte existant créé via email/mot de passe -> on le lie à Google
      if (!user) {
        const existing = await prisma.user.findUnique({ where: { email: profile.email } });
        if (existing) {
          user = await prisma.user.update({
            where: { id: existing.id },
            data: { googleId: profile.googleId },
          });
        }
      }

      // Aucun compte -> inscription
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.googleId,
            username: profile.username,
          },
        });
      }

      const token = signToken(user.id);
      return reply.send({ user: serializeUser(user), token });
    },
  );
}
