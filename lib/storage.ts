/**
 * lib/storage.ts — Local file storage replacing Supabase
 * Files are saved to /public/uploads/ and served statically
 */

import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Ensure upload directory exists */
async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // already exists
  }
}

/**
 * Save a buffer to /public/uploads/<subDir>/<filename>
 * Returns the public URL path: /uploads/<subDir>/<filename>
 */
export async function saveFile(
  subDir: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, subDir);
  await ensureDir(dir);

  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  return `/uploads/${subDir}/${filename}`;
}

/**
 * Delete a file by its public URL path
 */
export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    const relativePath = publicUrl.replace(/^\/uploads\//, "");
    const filePath = path.join(UPLOAD_DIR, relativePath);
    await fs.unlink(filePath);
  } catch {
    // ignore if file doesn't exist
  }
}

/** Sanitize a filename */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
