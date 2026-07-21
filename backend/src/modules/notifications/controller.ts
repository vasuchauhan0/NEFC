import { Request, Response } from 'express';
import { NotificationsService } from './service.ts';

const service = new NotificationsService();

export class NotificationsController {
  // POST /notifications/register-token — called by the mobile app right
  // after it gets OS permission + an Expo push token for this device.
  async registerToken(req: Request, res: Response): Promise<void> {
    try {
      const { token, deviceName } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Missing push token.' });
        return;
      }
      await service.registerToken(req.memberId!, token, deviceName);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to register push token' });
    }
  }

  // POST /notifications/unregister-token — called on logout so the device
  // stops receiving pushes meant for the now-logged-out member.
  async unregisterToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Missing push token.' });
        return;
      }
      await service.unregisterToken(token);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unregister push token' });
    }
  }

  // GET /notifications — the in-app notification inbox for the logged-in member.
  async getInbox(req: Request, res: Response): Promise<void> {
    try {
      const { items, unreadCount } = await service.getInbox(req.memberId!);
      res.json({ success: true, items, unreadCount });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  }

  async markRead(req: Request, res: Response): Promise<void> {
    try {
      await service.markRead(req.memberId!, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification' });
    }
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      await service.markAllRead(req.memberId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  }
}