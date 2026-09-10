import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  process.env.PRIVATE_STORAGE_PATH || "./storage/private"
);

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function ensureStorageDirectories(): Promise<void> {
  await fs.mkdir(path.join(STORAGE_ROOT, "citizenship"), { recursive: true });
  await fs.mkdir(path.join(STORAGE_ROOT, "receipts"), { recursive: true });
}

/**
 * Save a buffer securely into private storage
 * Returns relative key, e.g. "citizenship/abc123xyz.jpg"
 */
export async function savePrivateFile(
  buffer: Buffer,
  category: "citizenship" | "receipts",
  originalMimeType: string
): Promise<string> {
  await ensureStorageDirectories();

  let extension = ".jpg";
  if (originalMimeType === "image/png") extension = ".png";
  else if (originalMimeType === "image/webp") extension = ".webp";
  else if (originalMimeType === "application/pdf") extension = ".pdf";

  const randomId = crypto.randomBytes(16).toString("hex");
  const fileName = `${Date.now()}_${randomId}${extension}`;
  const relativeKey = `${category}/${fileName}`;
  const fullPath = path.join(STORAGE_ROOT, relativeKey);

  await fs.writeFile(fullPath, buffer);
  return relativeKey;
}

/**
 * Retrieve file from private storage
 * Throws error if file does not exist or tries to path traverse
 */
export async function getPrivateFile(
  relativeKey: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Prevent directory traversal attacks
  const safeKey = path.normalize(relativeKey).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(STORAGE_ROOT, safeKey);

  // Security check: ensure path is strictly inside STORAGE_ROOT
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error("Access denied: Invalid file path traversal");
  }

  const buffer = await fs.readFile(fullPath);

  let mimeType = "application/octet-stream";
  if (safeKey.endsWith(".jpg") || safeKey.endsWith(".jpeg")) mimeType = "image/jpeg";
  else if (safeKey.endsWith(".png")) mimeType = "image/png";
  else if (safeKey.endsWith(".webp")) mimeType = "image/webp";
  else if (safeKey.endsWith(".pdf")) mimeType = "application/pdf";

  return { buffer, mimeType };
}
