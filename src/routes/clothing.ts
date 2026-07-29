import { FastifyInstance } from "fastify";
import type { MultipartFile, MultipartValue } from "@fastify/multipart";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";
import { detectImageMimeType, MAX_CLOTHING_IMAGE_SIZE } from "../domain/image.js";
import {
  deleteClothingImage,
  getOwnedClothingImagePath,
  StorageConfigurationError,
  StorageOperationError,
  uploadClothingImage,
} from "../services/supabase-storage.js";
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
  color?: ClothingColor;
  material?: ClothingMaterial;
  season?: ClothingSeason;
  style?: ClothingStyle;
}

interface CreateClothingWithImageBody {
  name: MultipartValue<string>;
  category: MultipartValue<ClothingCategory>;
  color: MultipartValue<ClothingColor>;
  material: MultipartValue<ClothingMaterial>;
  season: MultipartValue<ClothingSeason>;
  style: MultipartValue<ClothingStyle>;
  image: MultipartFile;
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

function multipartFieldSchema(valueSchema: Record<string, unknown>) {
  return {
    type: "object",
    required: ["value"],
    properties: {
      value: valueSchema,
    },
  };
}

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
            imageAvatarUrl: { type: "string", pattern: "^https://" },
            imageDressingUrl: { type: "string", pattern: "^https://" },
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

  app.post<{ Body: CreateClothingWithImageBody }>(
    "/with-image",
    {
      config: {
        multipartOptions: {
          limits: {
            files: 1,
            fields: 6,
            parts: 7,
            fileSize: MAX_CLOTHING_IMAGE_SIZE,
          },
        },
      },
      schema: {
        tags: ["Clothing"],
        summary: "Ajouter un vêtement avec sa photo",
        consumes: ["multipart/form-data"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name", "category", "color", "material", "season", "style", "image"],
          properties: {
            name: multipartFieldSchema({ type: "string", minLength: 1, maxLength: 120 }),
            category: multipartFieldSchema({ type: "string", enum: CATEGORY_VALUES }),
            color: multipartFieldSchema({ type: "string", enum: COLOR_VALUES }),
            material: multipartFieldSchema({ type: "string", enum: MATERIAL_VALUES }),
            season: multipartFieldSchema({ type: "string", enum: SEASON_VALUES }),
            style: multipartFieldSchema({ type: "string", enum: STYLE_VALUES }),
            image: { isFile: true },
          },
        },
        response: {
          201: clothingItemSchema,
          400: errorSchema,
          413: errorSchema,
          415: errorSchema,
          502: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const uploadedImage = request.body.image;
      let image: Buffer;

      try {
        image = await uploadedImage.toBuffer();
      } catch (error) {
        if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
          return reply.code(413).send({ error: "L'image ne doit pas dépasser 8 Mo" });
        }
        throw error;
      }

      const mimeType = detectImageMimeType(image);
      if (!mimeType) {
        return reply.code(415).send({ error: "Format d'image non pris en charge" });
      }

      let storedImage;
      try {
        storedImage = await uploadClothingImage(request.userId, image, mimeType);
      } catch (error) {
        if (error instanceof StorageConfigurationError) {
          return reply.code(503).send({ error: "Le stockage des images n'est pas configuré" });
        }
        if (!(error instanceof StorageOperationError)) {
          throw error;
        }

        request.log.error({ err: error }, "Échec de l'upload du vêtement dans Supabase Storage");
        return reply.code(502).send({ error: "Impossible d'enregistrer l'image du vêtement" });
      }

      const { name, category, color, material, season, style } = request.body;

      try {
        const item = await prisma.clothingItem.create({
          data: {
            userId: request.userId,
            name: name.value,
            category: category.value,
            color: color.value,
            material: material.value,
            season: season.value,
            style: style.value,
            imageAvatarUrl: storedImage.publicUrl,
            imageDressingUrl: storedImage.publicUrl,
          },
        });

        return reply.code(201).send(serializeClothingItem(item));
      } catch (error) {
        try {
          await deleteClothingImage(storedImage.path);
        } catch (cleanupError) {
          request.log.warn({ err: cleanupError }, "Impossible de supprimer l'image après l'échec de création");
        }
        throw error;
      }
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
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
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
      const { name, color, material, season, style } = request.body;

      const existing = await prisma.clothingItem.findFirst({
        where: { id, userId: request.userId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "Vêtement introuvable" });
      }

      const item = await prisma.clothingItem.update({
        where: { id },
        data: { name, color, material, season, style },
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

      const storagePaths = new Set(
        [existing.imageAvatarUrl, existing.imageDressingUrl]
          .map((url) => getOwnedClothingImagePath(request.userId, url))
          .filter((path): path is string => path !== null),
      );

      for (const path of storagePaths) {
        try {
          await deleteClothingImage(path);
        } catch (error) {
          request.log.warn({ err: error, path }, "Impossible de supprimer l'image du vêtement dans Supabase Storage");
        }
      }

      return reply.code(204).send();
    },
  );
}
