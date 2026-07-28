import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";
import {
  ClothingCategory,
  ClothingColor,
  ClothingMaterial,
  ClothingSeason,
  ClothingStyle,
} from "../generated/prisma/enums.js";
import type { ClothingItemModel } from "../generated/prisma/models/ClothingItem.js";

const CATEGORY_VALUES = Object.values(ClothingCategory);
const COLOR_VALUES = Object.values(ClothingColor);
const MATERIAL_VALUES = Object.values(ClothingMaterial);
const SEASON_VALUES = Object.values(ClothingSeason);
const STYLE_VALUES = Object.values(ClothingStyle);

interface CreateClothingBody {
  name: string;
  category: ClothingCategory;
  color: ClothingColor;
  material: ClothingMaterial;
  season: ClothingSeason;
  style: ClothingStyle;
  imageAvatarUrl: string;
  imageDressingUrl: string;
}

interface UpdateClothingBody {
  name?: string;
  category?: ClothingCategory;
  color?: ClothingColor;
  material?: ClothingMaterial;
  season?: ClothingSeason;
  style?: ClothingStyle;
}

interface ClothingParams {
  id: string;
}

export function serializeClothingItem(item: ClothingItemModel) {
  return {
    id: item.id.toString(),
    name: item.name,
    category: item.category,
    color: item.color,
    material: item.material,
    season: item.season,
    style: item.style,
    imageAvatarUrl: item.imageAvatarUrl,
    imageDressingUrl: item.imageDressingUrl,
    createdAt: item.createdAt,
  };
}

export const clothingItemSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "category",
    "color",
    "material",
    "season",
    "style",
    "imageAvatarUrl",
    "imageDressingUrl",
    "createdAt",
  ],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    category: { type: "string", enum: CATEGORY_VALUES },
    color: { type: "string", enum: COLOR_VALUES },
    material: { type: "string", enum: MATERIAL_VALUES },
    season: { type: "string", enum: SEASON_VALUES },
    style: { type: "string", enum: STYLE_VALUES },
    imageAvatarUrl: { type: "string" },
    imageDressingUrl: { type: "string" },
    createdAt: { type: "string" },
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

export async function clothingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/",
    {
      schema: {
        tags: ["Clothing"],
        summary: "Lister les vêtements de l'utilisateur",
        response: {
          200: {
            type: "array",
            items: clothingItemSchema,
          },
        },
      },
    },
    async (request) => {
      const items = await prisma.clothingItem.findMany({
        where: { userId: request.userId },
        orderBy: { createdAt: "desc" },
      });

      return items.map(serializeClothingItem);
    },
  );

  app.post<{ Body: CreateClothingBody }>(
    "/",
    {
      schema: {
        tags: ["Clothing"],
        summary: "Ajouter un vêtement",
        body: {
          type: "object",
          required: [
            "name",
            "category",
            "color",
            "material",
            "season",
            "style",
            "imageAvatarUrl",
            "imageDressingUrl",
          ],
          properties: {
            name: { type: "string", maxLength: 120 },
            category: { type: "string", enum: CATEGORY_VALUES },
            color: { type: "string", enum: COLOR_VALUES },
            material: { type: "string", enum: MATERIAL_VALUES },
            season: { type: "string", enum: SEASON_VALUES },
            style: { type: "string", enum: STYLE_VALUES },
            imageAvatarUrl: { type: "string" },
            imageDressingUrl: { type: "string" },
          },
        },
        response: {
          201: clothingItemSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, category, color, material, season, style, imageAvatarUrl, imageDressingUrl } = request.body;

      const item = await prisma.clothingItem.create({
        data: {
          userId: request.userId,
          name,
          category,
          color,
          material,
          season,
          style,
          imageAvatarUrl,
          imageDressingUrl,
        },
      });

      return reply.code(201).send(serializeClothingItem(item));
    },
  );

  app.patch<{ Params: ClothingParams; Body: UpdateClothingBody }>(
    "/:id",
    {
      schema: {
        tags: ["Clothing"],
        summary: "Modifier un vêtement",
        params: idParamSchema,
        body: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 120 },
            category: { type: "string", enum: CATEGORY_VALUES },
            color: { type: "string", enum: COLOR_VALUES },
            material: { type: "string", enum: MATERIAL_VALUES },
            season: { type: "string", enum: SEASON_VALUES },
            style: { type: "string", enum: STYLE_VALUES },
          },
        },
        response: {
          200: clothingItemSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const id = BigInt(request.params.id);
      const { name, category, color, material, season, style } = request.body;

      const existing = await prisma.clothingItem.findFirst({
        where: { id, userId: request.userId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "Vêtement introuvable" });
      }

      const item = await prisma.clothingItem.update({
        where: { id },
        data: { name, category, color, material, season, style },
      });

      return reply.send(serializeClothingItem(item));
    },
  );

  app.delete<{ Params: ClothingParams }>(
    "/:id",
    {
      schema: {
        tags: ["Clothing"],
        summary: "Supprimer un vêtement",
        params: idParamSchema,
        response: {
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const id = BigInt(request.params.id);

      const existing = await prisma.clothingItem.findFirst({
        where: { id, userId: request.userId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "Vêtement introuvable" });
      }

      await prisma.clothingItem.delete({ where: { id } });

      return reply.code(204).send();
    },
  );
}
