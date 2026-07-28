export const CLOTHING_CATEGORIES = [
  "TOP",
  "BOTTOM",
  "DRESS",
  "OUTERWEAR",
  "SHOES",
  "ACCESSORY",
  "UNDERWEAR",
  "SPORTSWEAR",
  "OTHER",
  "UNKNOWN",
] as const;

export const CLOTHING_COLORS = [
  "BLACK",
  "WHITE",
  "GRAY",
  "BEIGE",
  "BROWN",
  "BLUE",
  "NAVY_BLUE",
  "GREEN",
  "KHAKI",
  "YELLOW",
  "ORANGE",
  "RED",
  "PINK",
  "PURPLE",
  "MULTICOLOR",
  "UNKNOWN",
] as const;

export const CLOTHING_MATERIALS = [
  "COTTON",
  "LINEN",
  "WOOL",
  "CASHMERE",
  "SILK",
  "LEATHER",
  "SUEDE",
  "DENIM",
  "POLYESTER",
  "NYLON",
  "VISCOSE",
  "ACRYLIC",
  "ELASTANE",
  "SYNTHETIC",
  "MIXED",
  "UNKNOWN",
] as const;

export const CLOTHING_SEASONS = [
  "SPRING",
  "SUMMER",
  "AUTUMN",
  "WINTER",
  "ALL_SEASONS",
  "UNKNOWN",
] as const;

export const CLOTHING_STYLES = [
  "CASUAL",
  "FORMAL",
  "BUSINESS",
  "SPORT",
  "STREETWEAR",
  "CHIC",
  "BOHEMIAN",
  "VINTAGE",
  "MINIMALIST",
  "PARTY",
  "WORKWEAR",
  "UNKNOWN",
] as const;

export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number];
export type ClothingColor = (typeof CLOTHING_COLORS)[number];
export type ClothingMaterial = (typeof CLOTHING_MATERIALS)[number];
export type ClothingSeason = (typeof CLOTHING_SEASONS)[number];
export type ClothingStyle = (typeof CLOTHING_STYLES)[number];

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
