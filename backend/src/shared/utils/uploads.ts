import path from 'path';
import fs from 'fs';

// Where uploaded member profile photos are stored on disk.
//
// Locally this defaults to ./uploads (next to the backend code).
// On Railway, attach a Volume to this service and set env var
// UPLOADS_PATH to its mount path, e.g. UPLOADS_PATH=/data/uploads —
// otherwise photos live on the container's ephemeral filesystem and
// are wiped on every redeploy/restart.
export const UPLOADS_ROOT = process.env.UPLOADS_PATH
  ? path.resolve(process.env.UPLOADS_PATH)
  : path.resolve(process.cwd(), 'uploads');

export const PHOTOS_DIR = path.join(UPLOADS_ROOT, 'photos');

export function ensureUploadsDir(): void {
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }
}