import { Request, Response } from 'express';
import { AnnouncementService } from './service.ts';

const service = new AnnouncementService();

export class AnnouncementController {
  async setAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;
      const announcement = await service.setAnnouncement(text);
      res.json({ success: true, announcement });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  }
}
