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
export const ANNOUNCEMENT_IMAGES_DIR = path.join(UPLOADS_ROOT, 'announcements');

export function ensureUploadsDir(): void {
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }
}

export function ensureAnnouncementImagesDir(): void {
  if (!fs.existsSync(ANNOUNCEMENT_IMAGES_DIR)) {
    fs.mkdirSync(ANNOUNCEMENT_IMAGES_DIR, { recursive: true });
  }
}

// Deletes a previously-uploaded announcement image by its public URL —
// called once a WhatsApp broadcast that used it has finished, so images
// don't pile up on the uploads volume after every send.
// Path-traversal guard: only ever deletes a file that resolves to inside
// ANNOUNCEMENT_IMAGES_DIR, and silently no-ops on anything else (an
// external image URL, a malformed URL, an already-deleted file, etc).
export function deleteAnnouncementImageByUrl(imageUrl: string): void {
  try {
    if (!imageUrl) return;

    const { pathname } = new URL(imageUrl);
    const filename = path.basename(pathname);
    if (!filename) return;

    const fullPath = path.join(ANNOUNCEMENT_IMAGES_DIR, filename);
    if (!fullPath.startsWith(ANNOUNCEMENT_IMAGES_DIR)) return; // outside our folder — don't touch it

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`[Announcements] Cleaned up image after broadcast: ${filename}`);
    }
  } catch (err: any) {
    console.error('[Announcements] Failed to clean up image:', err.message);
  }
}