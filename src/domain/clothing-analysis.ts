import {
  ClothingCategory,
  ClothingColor,
  ClothingMaterial,
  ClothingSeason,
  ClothingStyle,
} from "../generated/prisma/enums.js";

// Prisma is the server-side source of truth for both persistence and Gemini.
export const CLOTHING_CATEGORIES = Object.values(ClothingCategory);
export const CLOTHING_COLORS = Object.values(ClothingColor);
export const CLOTHING_MATERIALS = Object.values(ClothingMaterial);
export const CLOTHING_SEASONS = Object.values(ClothingSeason);
export const CLOTHING_STYLES = Object.values(ClothingStyle);

export interface ClothingAnalysis {
  category: ClothingCategory;
  color: ClothingColor;
  material: ClothingMaterial;
  season: ClothingSeason;
  style: ClothingStyle;
}

export const clothingAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["category", "color", "material", "season", "style"],
  properties: {
    category: {
      type: "string",
      enum: [...CLOTHING_CATEGORIES],
      description: "Catégorie principale du vêtement visible.",
    },
    color: {
      type: "string",
      enum: [...CLOTHING_COLORS],
      description: "Couleur dominante du vêtement.",
    },
    material: {
      type: "string",
      enum: [...CLOTHING_MATERIALS],
      description: "Matière la plus probable, ou UNKNOWN si elle ne peut pas être déduite visuellement.",
    },
    season: {
      type: "string",
      enum: [...CLOTHING_SEASONS],
      description: "Saison d'utilisation principale du vêtement.",
    },
    style: {
      type: "string",
      enum: [...CLOTHING_STYLES],
      description: "Style principal du vêtement.",
    },
  },
} as const;

function isAllowedValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function parseClothingAnalysis(value: unknown): ClothingAnalysis | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !isAllowedValue(CLOTHING_CATEGORIES, candidate.category) ||
    !isAllowedValue(CLOTHING_COLORS, candidate.color) ||
    !isAllowedValue(CLOTHING_MATERIALS, candidate.material) ||
    !isAllowedValue(CLOTHING_SEASONS, candidate.season) ||
    !isAllowedValue(CLOTHING_STYLES, candidate.style)
  ) {
    return null;
  }

  return {
    category: candidate.category,
    color: candidate.color,
    material: candidate.material,
    season: candidate.season,
    style: candidate.style,
  };
}
