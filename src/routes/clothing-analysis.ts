import { FastifyInstance } from "fastify";
import { clothingAnalysisJsonSchema } from "../domain/clothing-analysis.js";
import { analyzeClothingImage, GeminiAnalysisError } from "../services/gemini-clothing-analysis.js";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

interface UploadedImage {
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}

interface AnalyzeClothingBody {
  image: UploadedImage;
}

const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
  },
} as const;

function detectImageMimeType(image: Buffer): string | null {
  if (image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) {
    return "image/jpeg";
  }

  if (image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (image.length >= 12 && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }

  if (image.length >= 12 && image.toString("ascii", 4, 8) === "ftyp") {
    const brand = image.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) {
      return "image/heic";
    }
    if (["mif1", "msf1"].includes(brand)) {
      return "image/heif";
    }
  }

  return null;
}

export async function clothingAnalysisRoutes(app: FastifyInstance) {
  app.post<{ Body: AnalyzeClothingBody }>(
    "/analyze",
    {
      config: {
        multipartOptions: {
          limits: {
            files: 1,
            fields: 0,
            parts: 1,
            fileSize: MAX_IMAGE_SIZE,
          },
        },
      },
      schema: {
        tags: ["Clothing"],
        summary: "Analyser un vêtement à partir d'une photo",
        consumes: ["multipart/form-data"],
        body: {
          type: "object",
          required: ["image"],
          properties: {
            image: { isFile: true },
          },
        },
        response: {
          200: clothingAnalysisJsonSchema,
          400: errorSchema,
          413: errorSchema,
          415: errorSchema,
          429: errorSchema,
          502: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const uploadedImage = request.body.image;
      if (!uploadedImage || typeof uploadedImage.toBuffer !== "function") {
        return reply.code(400).send({ error: "Une image est requise" });
      }

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

      try {
        const analysis = await analyzeClothingImage(image, mimeType);
        return reply.send(analysis);
      } catch (error) {
        if (!(error instanceof GeminiAnalysisError)) {
          throw error;
        }

        request.log.error(
          {
            reason: error.reason,
            filename: uploadedImage.filename,
            declaredMimeType: uploadedImage.mimetype,
          },
          "Échec de l'analyse Gemini",
        );

        switch (error.reason) {
          case "MISSING_CONFIGURATION":
            return reply.code(503).send({ error: "L'analyse IA n'est pas configurée" });
          case "QUOTA_EXCEEDED":
            return reply.code(429).send({ error: "Le quota d'analyse IA est temporairement atteint" });
          case "INVALID_RESPONSE":
            return reply.code(502).send({ error: "L'IA n'a pas retourné une analyse valide" });
          case "UNAVAILABLE":
            return reply.code(503).send({ error: "Le service d'analyse IA est temporairement indisponible" });
        }
      }
    },
  );
}
