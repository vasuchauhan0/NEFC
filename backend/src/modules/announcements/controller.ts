import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AnnouncementService } from './service.ts';
import { ANNOUNCEMENT_IMAGES_DIR, ensureAnnouncementImagesDir } from '../../shared/utils/uploads.ts';

const service = new AnnouncementService();

export class AnnouncementController {
  async setAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { text, sendWhatsapp, extraPhones, imageUrl, recipientMode, selectedMemberIds } = req.body;

      // Sanitize: only keep non-empty strings, cap the list so a bad paste
      // can't trigger a huge accidental broadcast.
      const cleanedExtraPhones: string[] = Array.isArray(extraPhones)
        ? extraPhones
            .filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
            .map((p: string) => p.trim())
            .slice(0, 500)
        : [];

      // Only accept a proper http(s) link — WhatsApp's Cloud API fetches
      // the header image itself, so a relative/local path won't work there.
      const cleanedImageUrl: string =
        typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl.trim()) ? imageUrl.trim() : '';

      const cleanedRecipientMode: 'all' | 'selected' = recipientMode === 'selected' ? 'selected' : 'all';

      const cleanedSelectedMemberIds: string[] = Array.isArray(selectedMemberIds)
        ? selectedMemberIds
            .filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
            .map((id: string) => id.trim())
            .slice(0, 1000)
        : [];

      const announcement = await service.setAnnouncement(
        text,
        !!sendWhatsapp,
        cleanedExtraPhones,
        cleanedImageUrl,
        cleanedRecipientMode,
        cleanedSelectedMemberIds
      );
      res.json({ success: true, announcement });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  }

  // Accepts a single multipart image ('image') from the admin, writes it to
  // the uploads volume (same pattern as member profile photos), and returns
  // its public URL so the frontend can pass it straight into setAnnouncement
  // as `imageUrl`. Old announcement images are left in place (not cleaned up
  // per-send) since a previous image URL may still be referenced elsewhere.
  async uploadAnnouncementImage(req: Request, res: Response): Promise<void> {
    try {
      const file = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
      if (!file) {
        res.status(400).json({ error: 'No image file was uploaded.' });
        return;
      }

      ensureAnnouncementImagesDir();

      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `announcement-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(ANNOUNCEMENT_IMAGES_DIR, filename), file.buffer);

      const publicUrl = `${req.protocol}://${req.get('host')}/uploads/announcements/${filename}`;
      res.json({ success: true, imageUrl: publicUrl });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload announcement image.' });
    }
  }
}