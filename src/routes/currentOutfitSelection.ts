import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";
import { clothingItemSchema, serializeClothingItem } from "./clothing.js";
import type { CurrentOutfitSelectionModel } from "../generated/prisma/models/CurrentOutfitSelection.js";
import type { ClothingItemModel } from "../generated/prisma/models/ClothingItem.js";

interface ReplaceSelectionBody {
  clothingItemIds: string[];
}

type SelectionWithClothingItem = CurrentOutfitSelectionModel & { clothingItem: ClothingItemModel };

function serializeSelectionEntry(entry: SelectionWithClothingItem) {
  return {
    id: entry.id.toString(),
    category: entry.category,
    clothingItem: serializeClothingItem(entry.clothingItem),
  };
}

const selectionEntrySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    category: { type: "string" },
    clothingItem: clothingItemSchema,
  },
};

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export async function currentOutfitSelectionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/",
    {
      schema: {
        tags: ["Current outfit selection"],
        summary: "Récupérer la sélection courante sur le mannequin",
        response: {
          200: { type: "array", items: selectionEntrySchema },
        },
      },
    },
    async (request) => {
      const selection = await prisma.currentOutfitSelection.findMany({
        where: { userId: request.userId },
        include: { clothingItem: true },
      });

      return selection.map(serializeSelectionEntry);
    },
  );

  app.put<{ Body: ReplaceSelectionBody }>(
    "/",
    {
      schema: {
        tags: ["Current outfit selection"],
        summary: "Remplacer intégralement la sélection courante sur le mannequin",
        body: {
          type: "object",
          required: ["clothingItemIds"],
          properties: {
            clothingItemIds: {
              type: "array",
              items: { type: "string", pattern: "^[0-9]+$" },
            },
          },
        },
        response: {
          200: { type: "array", items: selectionEntrySchema },
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { clothingItemIds } = request.body;

      if (clothingItemIds.length === 0) {
        await prisma.currentOutfitSelection.deleteMany({ where: { userId: request.userId } });
        return reply.send([]);
      }

      const ids = clothingItemIds.map(BigInt);
      const items = await prisma.clothingItem.findMany({
        where: { id: { in: ids }, userId: request.userId },
      });
      if (items.length !== ids.length) {
        return reply.code(400).send({ error: "Un ou plusieurs vêtements sont introuvables" });
      }

      const categories = new Set(items.map((item) => item.category));
      if (categories.size !== items.length) {
        return reply
          .code(400)
          .send({ error: "Un seul vêtement par catégorie peut être sélectionné" });
      }

      const selection = await prisma.$transaction(async (tx) => {
        await tx.currentOutfitSelection.deleteMany({ where: { userId: request.userId } });
        await tx.currentOutfitSelection.createMany({
          data: items.map((item) => ({
            userId: request.userId,
            clothingItemId: item.id,
            category: item.category,
          })),
        });

        return tx.currentOutfitSelection.findMany({
          where: { userId: request.userId },
          include: { clothingItem: true },
        });
      });

      return reply.send(selection.map(serializeSelectionEntry));
    },
  );
}
