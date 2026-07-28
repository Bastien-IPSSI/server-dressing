import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { auth } from "../src/lib/auth.js";
import {
  ClothingCategory,
  ClothingColor,
  ClothingMaterial,
  ClothingSeason,
  ClothingStyle,
} from "../src/generated/prisma/enums.js";

const SEED_EMAIL = "user_tes@example.com";
const SEED_USERNAME = "user_tes";
const SEED_PASSWORD = "password123";
const SEED_AVATAR_URL =
  "https://rwxitzrxvlmawempmwue.supabase.co/storage/v1/object/public/public-assets/avatars/european1.webp";

const TEMPLATES_BASE_URL =
  "https://rwxitzrxvlmawempmwue.supabase.co/storage/v1/object/public/public-assets/templates";

interface ClothingTemplate {
  key: string;
  file: string;
  name: string;
  category: ClothingCategory;
  color: ClothingColor;
  material: ClothingMaterial;
  season: ClothingSeason;
  style: ClothingStyle;
}

const CLOTHING_TEMPLATES: ClothingTemplate[] = [
  {
    key: "tshirt-white",
    file: "tshirt-white.webp",
    name: "T-shirt blanc basique",
    category: ClothingCategory.TOP,
    color: ClothingColor.WHITE,
    material: ClothingMaterial.COTTON,
    season: ClothingSeason.ALL_SEASONS,
    style: ClothingStyle.CASUAL,
  },
  {
    key: "tshirt-oversize-col-rond",
    file: "tshirt-oversize-col-rond.webp",
    name: "T-shirt oversize col rond",
    category: ClothingCategory.TOP,
    color: ClothingColor.BLACK,
    material: ClothingMaterial.COTTON,
    season: ClothingSeason.SUMMER,
    style: ClothingStyle.STREETWEAR,
  },
  {
    key: "tshirt-oversize-col-v",
    file: "tshirt-oversize-col-v.webp",
    name: "T-shirt oversize col V",
    category: ClothingCategory.TOP,
    color: ClothingColor.GRAY,
    material: ClothingMaterial.COTTON,
    season: ClothingSeason.SUMMER,
    style: ClothingStyle.STREETWEAR,
  },
  {
    key: "short",
    file: "short.webp",
    name: "Short",
    category: ClothingCategory.BOTTOM,
    color: ClothingColor.BEIGE,
    material: ClothingMaterial.COTTON,
    season: ClothingSeason.SUMMER,
    style: ClothingStyle.CASUAL,
  },
  {
    key: "survet-large",
    file: "survet_large.webp",
    name: "Pantalon de survêtement large",
    category: ClothingCategory.BOTTOM,
    color: ClothingColor.BLACK,
    material: ClothingMaterial.POLYESTER,
    season: ClothingSeason.AUTUMN_WINTER,
    style: ClothingStyle.SPORT,
  },
  {
    key: "shoes-baskets",
    file: "shoes_baskets.webp",
    name: "Baskets",
    category: ClothingCategory.SHOES,
    color: ClothingColor.WHITE,
    material: ClothingMaterial.MIXED,
    season: ClothingSeason.ALL_SEASONS,
    style: ClothingStyle.CASUAL,
  },
  {
    key: "shoes-city",
    file: "shoes_city.webp",
    name: "Chaussures ville",
    category: ClothingCategory.SHOES,
    color: ClothingColor.BROWN,
    material: ClothingMaterial.LEATHER,
    season: ClothingSeason.ALL_SEASONS,
    style: ClothingStyle.SMART_CASUAL,
  },
  {
    key: "shoes-foot",
    file: "shoes_foot.webp",
    name: "Chaussures de foot",
    category: ClothingCategory.SHOES,
    color: ClothingColor.BLACK,
    material: ClothingMaterial.SYNTHETIC,
    season: ClothingSeason.ALL_SEASONS,
    style: ClothingStyle.SPORT,
  },
];

async function main() {
  // Repart d'un état propre à chaque exécution : le cascade delete nettoie
  // comptes / sessions / vêtements / tenues / sélection courante liés à l'utilisateur de seed.
  await prisma.user.deleteMany({ where: { email: SEED_EMAIL } });

  // Passe par l'API Better Auth (et non prisma.user.create) pour que le compte
  // "accounts" (provider credential + hash de mot de passe) soit créé correctement.
  const { user } = await auth.api.signUpEmail({
    body: {
      name: SEED_USERNAME,
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      image: SEED_AVATAR_URL,
    },
  });

  const itemsByKey = new Map<string, bigint>();
  for (const template of CLOTHING_TEMPLATES) {
    const imageUrl = `${TEMPLATES_BASE_URL}/${template.file}`;
    const item = await prisma.clothingItem.create({
      data: {
        userId: user.id,
        name: template.name,
        category: template.category,
        color: template.color,
        material: template.material,
        season: template.season,
        style: template.style,
        imageAvatarUrl: imageUrl,
        imageDressingUrl: imageUrl,
      },
    });
    itemsByKey.set(template.key, item.id);
  }

  await prisma.outfit.create({
    data: {
      userId: user.id,
      name: "Look décontracté",
      isFavorite: true,
      items: {
        createMany: {
          data: [
            { clothingItemId: itemsByKey.get("tshirt-white")! },
            { clothingItemId: itemsByKey.get("short")! },
            { clothingItemId: itemsByKey.get("shoes-baskets")! },
          ],
        },
      },
    },
  });

  await prisma.outfit.create({
    data: {
      userId: user.id,
      name: "Look streetwear",
      isFavorite: false,
      items: {
        createMany: {
          data: [
            { clothingItemId: itemsByKey.get("tshirt-oversize-col-rond")! },
            { clothingItemId: itemsByKey.get("survet-large")! },
            { clothingItemId: itemsByKey.get("shoes-city")! },
          ],
        },
      },
    },
  });

  console.log(`Seed OK — utilisateur ${SEED_EMAIL} (username: ${SEED_USERNAME}, password: ${SEED_PASSWORD})`);
  console.log(`${itemsByKey.size} vêtements créés, 2 tenues créées.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
