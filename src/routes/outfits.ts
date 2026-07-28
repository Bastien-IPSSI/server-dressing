import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";
import { clothingItemSchema, serializeClothingItem } from "./clothing";
import type { OutfitModel } from "../generated/prisma/models/Outfit";
import type { OutfitItemModel } from "../generated/prisma/models/OutfitItem";
import type { ClothingItemModel } from "../generated/prisma/models/ClothingItem";

interface CreateOutfitBody {
  name?: string;
  isFavorite?: boolean;
  clothingItemIds?: string[];
}

interface UpdateOutfitBody {
  name?: string | null;
  isFavorite?: boolean;
}

interface OutfitParams {
  id: string;
}

interface AddOutfitItemBody {
  clothingItemId: string;
}

interface OutfitItemParams {
  id: string;
  clothingItemId: string;
}

type OutfitWithItems = OutfitModel & {
  items: (OutfitItemModel & { clothingItem: ClothingItemModel })[];
};

type OutfitItemWithClothingItem = OutfitItemModel & { clothingItem: ClothingItemModel };

function serializeOutfitItem(outfitItem: OutfitItemWithClothingItem) {
  return {
    id: outfitItem.id.toString(),
    clothingItem: serializeClothingItem(outfitItem.clothingItem),
  };
}

function serializeOutfit(outfit: OutfitWithItems) {
  return {
    id: outfit.id.toString(),
    name: outfit.name,
    isFavorite: outfit.isFavorite,
    createdAt: outfit.createdAt,
    items: outfit.items.map(serializeOutfitItem),
  };
}

const outfitItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    clothingItem: clothingItemSchema,
  },
};

const outfitSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: ["string", "null"] },
    isFavorite: { type: "boolean" },
    createdAt: { type: "string" },
    items: { type: "array", items: outfitItemSchema },
  },
};

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

const idParamSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", pattern: "^[0-9]+$" },
  },
};

const outfitItemParamSchema = {
  type: "object",
  required: ["id", "clothingItemId"],
  properties: {
    id: { type: "string", pattern: "^[0-9]+$" },
    clothingItemId: { type: "string", pattern: "^[0-9]+$" },
  },
};

const outfitItemInclude = { items: { include: { clothingItem: true } } } as const;

export async function outfitRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post<{ Body: CreateOutfitBody }>(
    "/",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Créer une tenue",
        body: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 120 },
            isFavorite: { type: "boolean" },
            clothingItemIds: {
              type: "array",
              items: { type: "string", pattern: "^[0-9]+$" },
            },
          },
        },
        response: {
          201: outfitSchema,
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, isFavorite, clothingItemIds } = request.body;

      if (clothingItemIds?.length) {
        const ownedCount = await prisma.clothingItem.count({
          where: { id: { in: clothingItemIds.map(BigInt) }, userId: request.userId },
        });
        if (ownedCount !== clothingItemIds.length) {
          return reply.code(400).send({ error: "Un ou plusieurs vêtements sont introuvables" });
        }
      }

      const outfit = await prisma.$transaction(async (tx) => {
        const created = await tx.outfit.create({
          data: { userId: request.userId, name, isFavorite },
        });

        if (clothingItemIds?.length) {
          await tx.outfitItem.createMany({
            data: clothingItemIds.map((clothingItemId) => ({
              outfitId: created.id,
              clothingItemId: BigInt(clothingItemId),
            })),
          });
        }

        return tx.outfit.findUniqueOrThrow({
          where: { id: created.id },
          include: outfitItemInclude,
        });
      });

      return reply.code(201).send(serializeOutfit(outfit));
    },
  );

  app.get(
    "/",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Lister les tenues",
        response: {
          200: { type: "array", items: outfitSchema },
        },
      },
    },
    async (request) => {
      const outfits = await prisma.outfit.findMany({
        where: { userId: request.userId },
        include: outfitItemInclude,
        orderBy: { createdAt: "desc" },
      });

      return outfits.map(serializeOutfit);
    },
  );

  app.get<{ Params: OutfitParams }>(
    "/:id",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Récupérer une tenue",
        params: idParamSchema,
        response: {
          200: outfitSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const id = BigInt(request.params.id);

      const outfit = await prisma.outfit.findFirst({
        where: { id, userId: request.userId },
        include: outfitItemInclude,
      });
      if (!outfit) {
        return reply.code(404).send({ error: "Tenue introuvable" });
      }

      return reply.send(serializeOutfit(outfit));
    },
  );

  app.patch<{ Params: OutfitParams; Body: UpdateOutfitBody }>(
    "/:id",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Modifier une tenue",
        params: idParamSchema,
        body: {
          type: "object",
          properties: {
            name: { type: ["string", "null"], maxLength: 120 },
            isFavorite: { type: "boolean" },
          },
        },
        response: {
          200: outfitSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const id = BigInt(request.params.id);
      const { name, isFavorite } = request.body;

      const existing = await prisma.outfit.findFirst({
        where: { id, userId: request.userId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "Tenue introuvable" });
      }

      await prisma.outfit.update({
        where: { id },
        data: { name, isFavorite },
      });

      const outfit = await prisma.outfit.findUniqueOrThrow({
        where: { id },
        include: outfitItemInclude,
      });

      return reply.send(serializeOutfit(outfit));
    },
  );

  app.delete<{ Params: OutfitParams }>(
    "/:id",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Supprimer une tenue",
        params: idParamSchema,
        response: {
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const id = BigInt(request.params.id);

      const existing = await prisma.outfit.findFirst({
        where: { id, userId: request.userId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "Tenue introuvable" });
      }

      await prisma.outfit.delete({ where: { id } });

      return reply.code(204).send();
    },
  );

  app.post<{ Params: OutfitParams; Body: AddOutfitItemBody }>(
    "/:id/items",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Associer un vêtement à une tenue",
        params: idParamSchema,
        body: {
          type: "object",
          required: ["clothingItemId"],
          properties: {
            clothingItemId: { type: "string", pattern: "^[0-9]+$" },
          },
        },
        response: {
          201: outfitItemSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const outfitId = BigInt(request.params.id);
      const clothingItemId = BigInt(request.body.clothingItemId);

      const outfit = await prisma.outfit.findFirst({
        where: { id: outfitId, userId: request.userId },
      });
      if (!outfit) {
        return reply.code(404).send({ error: "Tenue introuvable" });
      }

      const clothingItem = await prisma.clothingItem.findFirst({
        where: { id: clothingItemId, userId: request.userId },
      });
      if (!clothingItem) {
        return reply.code(404).send({ error: "Vêtement introuvable" });
      }

      const existing = await prisma.outfitItem.findUnique({
        where: { outfitId_clothingItemId: { outfitId, clothingItemId } },
      });
      if (existing) {
        return reply.code(409).send({ error: "Ce vêtement est déjà associé à la tenue" });
      }

      const outfitItem = await prisma.outfitItem.create({
        data: { outfitId, clothingItemId },
        include: { clothingItem: true },
      });

      return reply.code(201).send(serializeOutfitItem(outfitItem));
    },
  );

  app.delete<{ Params: OutfitItemParams }>(
    "/:id/items/:clothingItemId",
    {
      schema: {
        tags: ["Outfits"],
        summary: "Retirer un vêtement d'une tenue",
        params: outfitItemParamSchema,
        response: {
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const outfitId = BigInt(request.params.id);
      const clothingItemId = BigInt(request.params.clothingItemId);

      const outfit = await prisma.outfit.findFirst({
        where: { id: outfitId, userId: request.userId },
      });
      if (!outfit) {
        return reply.code(404).send({ error: "Tenue introuvable" });
      }

      const existing = await prisma.outfitItem.findUnique({
        where: { outfitId_clothingItemId: { outfitId, clothingItemId } },
      });
      if (!existing) {
        return reply.code(404).send({ error: "Association introuvable" });
      }

      await prisma.outfitItem.delete({ where: { id: existing.id } });

      return reply.code(204).send();
    },
  );
}
