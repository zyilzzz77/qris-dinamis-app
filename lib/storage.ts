/**
 * lib/storage.ts — Local file storage replacing Supabase
 * Files are saved under /public/uploads/ and exposed via /uploads/*
 */

import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const UPLOADS_ROUTE_PREFIX = "/uploads/";
const FILES_API_ROUTE_PREFIX = "/api/files/";

function extractPathname(input: string): string {
  try {
    return new URL(input).pathname;
  } catch {
    return input;
  }
}

function toRelativeUploadPath(fileUrlOrPath: string): string | null {
  const pathname = extractPathname(fileUrlOrPath).trim();

  if (pathname.startsWith(UPLOADS_ROUTE_PREFIX)) {
    return pathname.slice(UPLOADS_ROUTE_PREFIX.length);
  }

  if (pathname.startsWith(FILES_API_ROUTE_PREFIX)) {
    return pathname.slice(FILES_API_ROUTE_PREFIX.length);
  }

  return null;
}

export function resolveUploadAbsolutePath(relativePath: string): string | null {
  const cleaned = relativePath
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

  if (!cleaned) {
    return null;
  }

  const uploadRoot = path.resolve(UPLOAD_DIR);
  const target = path.resolve(uploadRoot, cleaned);

  if (target !== uploadRoot && !target.startsWith(`${uploadRoot}${path.sep}`)) {
    return null;
  }

  return target;
}

export function resolveUploadAbsolutePathFromUrl(fileUrlOrPath: string): string | null {
  const relativePath = toRelativeUploadPath(fileUrlOrPath);
  if (!relativePath) {
    return null;
  }

  return resolveUploadAbsolutePath(relativePath);
}

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
    const filePath = resolveUploadAbsolutePathFromUrl(publicUrl);

    if (!filePath) {
      return;
    }

    await fs.unlink(filePath);
  } catch {
    // ignore if file doesn't exist
  }
}

/** Sanitize a filename */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
