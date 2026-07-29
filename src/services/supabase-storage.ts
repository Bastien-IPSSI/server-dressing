import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLOTHING_IMAGE_EXTENSIONS, type ClothingImageMimeType } from "../domain/image.js";

const DEFAULT_STORAGE_BUCKET = "public-assets";
const CLOTHING_FOLDER = "clothing";

interface StorageContext {
  bucket: string;
  client: SupabaseClient;
  projectUrl: string;
}

export interface UploadedClothingImage {
  path: string;
  publicUrl: string;
}

export class StorageConfigurationError extends Error {
  constructor() {
    super("Supabase Storage is not configured");
    this.name = "StorageConfigurationError";
  }
}

export class StorageOperationError extends Error {
  constructor(operation: "upload" | "delete", cause: unknown) {
    super(`Supabase Storage ${operation} failed`, { cause });
    this.name = "StorageOperationError";
  }
}

let storageContext: StorageContext | undefined;

function getStorageContext(): StorageContext {
  if (storageContext) {
    return storageContext;
  }

  const projectUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;

  if (!projectUrl || !serviceRoleKey) {
    throw new StorageConfigurationError();
  }

  try {
    const url = new URL(projectUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new StorageConfigurationError();
  }

  storageContext = {
    bucket,
    client: createClient(projectUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
    projectUrl,
  };

  return storageContext;
}

function userFolder(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

export async function uploadClothingImage(
  userId: string,
  image: Buffer,
  mimeType: ClothingImageMimeType,
): Promise<UploadedClothingImage> {
  const { bucket, client } = getStorageContext();
  const extension = CLOTHING_IMAGE_EXTENSIONS[mimeType];
  const path = `${CLOTHING_FOLDER}/${userFolder(userId)}/${randomUUID()}.${extension}`;

  const { error } = await client.storage.from(bucket).upload(path, image, {
    cacheControl: "31536000",
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new StorageOperationError("upload", error);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteClothingImage(path: string): Promise<void> {
  const { bucket, client } = getStorageContext();
  const { error } = await client.storage.from(bucket).remove([path]);

  if (error) {
    throw new StorageOperationError("delete", error);
  }
}

export function getOwnedClothingImagePath(userId: string, publicUrl: string): string | null {
  let context: StorageContext;
  try {
    context = getStorageContext();
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return null;
    }
    throw error;
  }

  const { bucket, projectUrl } = context;

  try {
    const configuredUrl = new URL(projectUrl);
    const imageUrl = new URL(publicUrl);
    const publicPathPrefix = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;

    if (imageUrl.origin !== configuredUrl.origin || !imageUrl.pathname.startsWith(publicPathPrefix)) {
      return null;
    }

    const path = decodeURIComponent(imageUrl.pathname.slice(publicPathPrefix.length));
    const ownedPrefix = `${CLOTHING_FOLDER}/${userFolder(userId)}/`;
    return path.startsWith(ownedPrefix) ? path : null;
  } catch {
    return null;
  }
}
