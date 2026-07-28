import { FastifyInstance } from "fastify";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";
import type { UserModel } from "../generated/prisma/models/User.js";

interface UpdateAvatarBody {
  image: string;
}

interface UpdateUsernameBody {
  username: string;
}

function serializeUser(user: UserModel) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    bio: user.bio,
    createdAt: user.createdAt,
  };
}

const userSchema = {
  type: "object",
  required: ["id", "name", "email", "image", "bio", "createdAt"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    image: { type: "string", nullable: true },
    bio: { type: "string", nullable: true },
    createdAt: { type: "string" },
  },
};

const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
  },
};

const usernameConflictSchema = {
  type: "object",
  required: ["error", "code"],
  properties: {
    error: { type: "string" },
    code: { type: "string", const: "USERNAME_TAKEN" },
  },
};

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/",
    {
      schema: {
        tags: ["User"],
        summary: "Récupérer les informations de l'utilisateur connecté",
        response: {
          200: userSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });
      if (!user) {
        return reply.code(404).send({ error: "Utilisateur introuvable" });
      }

      return reply.send(serializeUser(user));
    },
  );

  app.patch<{ Body: UpdateAvatarBody }>(
    "/avatar",
    {
      schema: {
        tags: ["User"],
        summary: "Mettre à jour l'avatar de l'utilisateur connecté",
        body: {
          type: "object",
          required: ["image"],
          properties: {
            image: { type: "string", format: "uri" },
          },
        },
        response: {
          200: userSchema,
        },
      },
    },
    async (request, reply) => {
      const { image } = request.body;

      const user = await prisma.user.update({
        where: { id: request.userId },
        data: { image },
      });

      return reply.send(serializeUser(user));
    },
  );

  app.patch<{ Body: UpdateUsernameBody }>(
    "/username",
    {
      schema: {
        tags: ["User"],
        summary: "Mettre à jour le nom d'utilisateur de l'utilisateur connecté",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["username"],
          properties: {
            username: { type: "string", minLength: 1, maxLength: 100 },
          },
        },
        response: {
          200: userSchema,
          400: errorSchema,
          401: errorSchema,
          409: usernameConflictSchema,
        },
      },
    },
    async (request, reply) => {
      const username = request.body.username.trim();

      if (!username) {
        return reply.code(400).send({ error: "Le nom d'utilisateur est requis" });
      }

      try {
        const user = await prisma.user.update({
          where: { id: request.userId },
          data: { name: username },
        });

        return reply.send(serializeUser(user));
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return reply.code(409).send({
            error: "Ce nom d'utilisateur est déjà pris",
            code: "USERNAME_TAKEN",
          });
        }

        throw error;
      }
    },
  );
}
