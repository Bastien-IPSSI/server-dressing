export const MAX_CLOTHING_IMAGE_SIZE = 8 * 1024 * 1024;

export const CLOTHING_IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
} as const;

export type ClothingImageMimeType = keyof typeof CLOTHING_IMAGE_EXTENSIONS;

export function detectImageMimeType(image: Buffer): ClothingImageMimeType | null {
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
