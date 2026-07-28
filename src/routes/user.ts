import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";
import type { UserModel } from "../generated/prisma/models/User.js";

interface UpdateAvatarBody {
  image: string;
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
  properties: {
    error: { type: "string" },
  },
};

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
}
