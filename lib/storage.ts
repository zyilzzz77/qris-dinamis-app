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

function normalizeRelativePath(input: string): string {
  return input
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

export function resolveUploadAbsolutePath(relativePath: string): string | null {
  const cleaned = normalizeRelativePath(relativePath);

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
  const safeSubDir = normalizeRelativePath(subDir);
  const safeFilename = sanitizeFilename(filename.trim());

  if (!safeFilename) {
    throw new Error("Invalid upload filename");
  }

  const relativePath = safeSubDir
    ? `${safeSubDir}/${safeFilename}`
    : safeFilename;

  const absolutePath = resolveUploadAbsolutePath(relativePath);

  if (!absolutePath) {
    throw new Error("Invalid upload target path");
  }

  await ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, buffer);

  const uploadRoot = path.resolve(UPLOAD_DIR);
  const publicPath = path.relative(uploadRoot, absolutePath).replace(/\\/g, "/");

  return `/uploads/${publicPath}`;
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
