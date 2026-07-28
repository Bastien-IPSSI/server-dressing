-- Extend the existing category enum with every value supported by analysis.
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'DRESS';
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'OUTERWEAR';
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'ACCESSORY';
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'UNDERWEAR';
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'SPORTSWEAR';
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "clothing_category" ADD VALUE IF NOT EXISTS 'UNKNOWN';

-- Keep existing season data while adopting the canonical API names.
ALTER TYPE "season" RENAME VALUE 'ALL' TO 'ALL_SEASONS';
ALTER TYPE "season" ADD VALUE IF NOT EXISTS 'UNKNOWN';

-- Keep existing style data while removing the SPORT/SPORTY synonym.
ALTER TYPE "clothing_style" RENAME VALUE 'SPORTY' TO 'SPORT';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'BUSINESS';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'BOHEMIAN';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'VINTAGE';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'MINIMALIST';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'PARTY';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'WORKWEAR';
ALTER TYPE "clothing_style" ADD VALUE IF NOT EXISTS 'UNKNOWN';

-- Color and material are canonical enums shared by persistence and Gemini.
CREATE TYPE "clothing_color" AS ENUM (
  'BLACK',
  'WHITE',
  'GRAY',
  'BEIGE',
  'BROWN',
  'BLUE',
  'NAVY_BLUE',
  'GREEN',
  'KHAKI',
  'YELLOW',
  'ORANGE',
  'RED',
  'PINK',
  'PURPLE',
  'MULTICOLOR',
  'UNKNOWN'
);

CREATE TYPE "clothing_material" AS ENUM (
  'COTTON',
  'LINEN',
  'WOOL',
  'CASHMERE',
  'SILK',
  'LEATHER',
  'SUEDE',
  'DENIM',
  'POLYESTER',
  'NYLON',
  'VISCOSE',
  'ACRYLIC',
  'ELASTANE',
  'SYNTHETIC',
  'MIXED',
  'UNKNOWN'
);

ALTER TABLE "clothing_items"
  ALTER COLUMN "color" TYPE "clothing_color"
  USING (
    CASE UPPER(TRIM("color"))
      WHEN '#000000' THEN 'BLACK'
      WHEN 'BLACK' THEN 'BLACK'
      WHEN 'NOIR' THEN 'BLACK'
      WHEN '#FFFFFF' THEN 'WHITE'
      WHEN 'WHITE' THEN 'WHITE'
      WHEN 'BLANC' THEN 'WHITE'
      WHEN 'GREY' THEN 'GRAY'
      WHEN 'GRAY' THEN 'GRAY'
      WHEN 'GRIS' THEN 'GRAY'
      WHEN 'BEIGE' THEN 'BEIGE'
      WHEN 'BROWN' THEN 'BROWN'
      WHEN 'MARRON' THEN 'BROWN'
      WHEN 'BLUE' THEN 'BLUE'
      WHEN 'BLEU' THEN 'BLUE'
      WHEN 'NAVY' THEN 'NAVY_BLUE'
      WHEN 'NAVY_BLUE' THEN 'NAVY_BLUE'
      WHEN 'BLEU MARINE' THEN 'NAVY_BLUE'
      WHEN 'GREEN' THEN 'GREEN'
      WHEN 'VERT' THEN 'GREEN'
      WHEN 'KHAKI' THEN 'KHAKI'
      WHEN 'KAKI' THEN 'KHAKI'
      WHEN 'YELLOW' THEN 'YELLOW'
      WHEN 'JAUNE' THEN 'YELLOW'
      WHEN 'ORANGE' THEN 'ORANGE'
      WHEN 'RED' THEN 'RED'
      WHEN 'ROUGE' THEN 'RED'
      WHEN 'PINK' THEN 'PINK'
      WHEN 'ROSE' THEN 'PINK'
      WHEN 'PURPLE' THEN 'PURPLE'
      WHEN 'VIOLET' THEN 'PURPLE'
      WHEN 'MULTICOLOR' THEN 'MULTICOLOR'
      WHEN 'MULTICOLORE' THEN 'MULTICOLOR'
      ELSE 'UNKNOWN'
    END
  )::"clothing_color";

ALTER TABLE "clothing_items"
  ADD COLUMN "material" "clothing_material" NOT NULL DEFAULT 'UNKNOWN';
